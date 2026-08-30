import { describe, expect, it, vi } from "vitest";

import { buildDeterministicBoard } from "../../server/networking-dna/final-reasoner.js";
import {
  buildAssistantMessage,
  processNetworkingDnaMessage,
  type NetworkingDnaMessageTimingStage,
} from "../../server/networking-dna/pipeline.js";
import {
  CandidateScorerResultsSchema,
  ScenarioContextSchema,
  type ConversationMessage,
  type NetworkingSessionRow,
  type RecommendationBoard,
  type ScenarioContext,
} from "../../server/networking-dna/schemas.js";
import type { SessionRepository } from "../../server/networking-dna/session-repository.js";
import fixture from "./fixtures/austin-family-business.json";

describe("Networking DNA pipeline", () => {
  it("updates one living session and returns a grounded recommendation board", async () => {
    const context = ScenarioContextSchema.parse(fixture.structured_context);
    const candidates = CandidateScorerResultsSchema.parse(fixture.scorer_results);
    const calls: string[] = [];

    const repository: SessionRepository = {
      createSession: vi.fn(),
      getSession: vi.fn(async (sessionId: string): Promise<NetworkingSessionRow> => {
        calls.push("getSession");
        return {
          id: sessionId,
          current_summary: null,
          current_structured_context: null,
          current_recommendations: null,
        };
      }),
      listRecentMessages: vi.fn(async (): Promise<ConversationMessage[]> => {
        calls.push("listRecentMessages");
        return [];
      }),
      saveMessage: vi.fn(async (_sessionId, role) => {
        calls.push(`saveMessage:${role}`);
      }),
      upsertCurrentScenario: vi.fn(async () => {
        calls.push("upsertCurrentScenario");
      }),
      previewCandidates: vi.fn(async () => {
        calls.push("previewCandidates");
        return candidates;
      }),
      updateSessionState: vi.fn(async () => {
        calls.push("updateSessionState");
      }),
    };

    const scenarioInterpreter = {
      interpret: vi.fn(async (): Promise<ScenarioContext> => {
        calls.push("interpret");
        return context;
      }),
    };

    const finalReasoner = {
      buildBoard: vi.fn(async (): Promise<RecommendationBoard> => {
        calls.push("buildBoard");
        return buildDeterministicBoard(context, candidates);
      }),
    };

    const response = await processNetworkingDnaMessage("session-123", fixture.message, {
      repository,
      scenarioInterpreter,
      finalReasoner,
      recentMessageLimit: 12,
    });

    expect(calls).toEqual([
      "getSession",
      "listRecentMessages",
      "saveMessage:user",
      "interpret",
      "upsertCurrentScenario",
      "previewCandidates",
      "buildBoard",
      "updateSessionState",
      "saveMessage:assistant",
    ]);
    expect(repository.upsertCurrentScenario).toHaveBeenCalledTimes(1);
    expect(repository.previewCandidates).toHaveBeenCalledWith(context, 3);
    expect(response.session_id).toBe("session-123");
    expect(response.structured_context.observed.location.city).toBe("Austin");
    expect(response.recommendation_board.total_recommendations).toBe(candidates.length);
    expect(response.assistant_message).not.toMatch(
      /grounded candidate|scorer|inferred need|ranking|match type/i,
    );
    expect(response.open_questions).toHaveLength(3);
  });

  it("records elapsed timings for each message pipeline stage", async () => {
    const context = ScenarioContextSchema.parse(fixture.structured_context);
    const candidates = CandidateScorerResultsSchema.parse(fixture.scorer_results);
    const ticks = [0, 5, 5, 6, 6, 16, 16, 19, 19, 27, 27, 40, 40, 47];
    const timings: Array<[NetworkingDnaMessageTimingStage, number]> = [];

    const repository: SessionRepository = {
      createSession: vi.fn(),
      getSession: vi.fn(async (sessionId: string): Promise<NetworkingSessionRow> => ({
        id: sessionId,
        current_summary: null,
        current_structured_context: null,
        current_recommendations: null,
      })),
      listRecentMessages: vi.fn(async (): Promise<ConversationMessage[]> => []),
      saveMessage: vi.fn(async () => undefined),
      upsertCurrentScenario: vi.fn(async () => undefined),
      previewCandidates: vi.fn(async () => candidates),
      updateSessionState: vi.fn(async () => undefined),
    };

    const scenarioInterpreter = {
      interpret: vi.fn(async (): Promise<ScenarioContext> => context),
    };

    const finalReasoner = {
      buildBoard: vi.fn(async (): Promise<RecommendationBoard> =>
        buildDeterministicBoard(context, candidates),
      ),
    };

    await processNetworkingDnaMessage(
      "session-123",
      fixture.message,
      {
        repository,
        scenarioInterpreter,
        finalReasoner,
        recentMessageLimit: 12,
      },
      {
        now: () => ticks.shift() ?? 47,
        onTiming: (stage, elapsedMs) => {
          timings.push([stage, elapsedMs]);
        },
      },
    );

    expect(timings).toEqual([
      ["session_history_retrieval", 5],
      ["session_message_persistence", 1],
      ["scenario_interpreter", 10],
      ["scenario_upsert", 3],
      ["preview_referral_candidates", 8],
      ["final_reasoner", 13],
      ["session_message_persistence", 7],
    ]);
  });
});

describe("buildAssistantMessage", () => {
  it("handles zero-result boards without exposing internal matching language", () => {
    const message = buildAssistantMessage(buildBoard([]));

    expect(message).toBe(
      "I do not have a strong BXN referral plan yet. Share a little more about what kind of help would be most useful, and I will keep narrowing it down.",
    );
    expect(message).not.toMatch(/grounded candidate|scorer|inferred need|ranking|match type/i);
  });

  it("mentions one recommended member and omits open questions", () => {
    const message = buildAssistantMessage(
      buildBoard(
        [
          recommendation({
            full_name: "Miguel Escobedo",
            need_label: "General Contractor",
          }),
        ],
        {
          openQuestion: "What is the repair timeline?",
        },
      ),
    );

    expect(message).toBe(
      "I found one useful BXN member to consider: Miguel Escobedo for general contractor.",
    );
    expect(message).not.toContain("What is the repair timeline?");
  });

  it("mentions up to two recommended members for a richer board", () => {
    const message = buildAssistantMessage(
      buildBoard([
        recommendation({ full_name: "Miguel Escobedo", need_label: "General Contractor" }),
        recommendation({ full_name: "Sam Rivera", need_label: "HVAC" }),
        recommendation({ full_name: "Dana Lee", need_label: "Roofing" }),
      ]),
    );

    expect(message).toBe(
      "There are a few useful BXN members to consider. I would start with Miguel Escobedo for general contractor and Sam Rivera for HVAC.",
    );
    expect(message).not.toContain("Dana Lee");
  });

  it("handles a single recommended member with supporting options", () => {
    const message = buildAssistantMessage(
      buildBoard([
        recommendation({ full_name: "Miguel Escobedo", need_label: "General Contractor" }),
        recommendation({
          full_name: "Casey Morgan",
          need_label: "Home Inspection",
          display_tier: "also_consider",
          match_type: "adjacent",
        }),
      ]),
    );

    expect(message).toBe(
      "I found one strong place to start: Miguel Escobedo for general contractor. I also see a few supporting options on the board.",
    );
  });

  it("handles also-consider-only boards as supporting options", () => {
    const message = buildAssistantMessage(
      buildBoard([
        recommendation({
          full_name: "Casey Morgan",
          need_label: "Home Inspection",
          display_tier: "also_consider",
          match_type: "adjacent",
        }),
      ]),
    );

    expect(message).toBe(
      "I found one supporting BXN option to consider, including Casey Morgan for home inspection. These may be useful, but I would treat them as secondary until the situation is clearer.",
    );
    expect(message).not.toMatch(
      /also_consider|grounded candidate|scorer|inferred need|ranking|match type/i,
    );
  });
});

function buildBoard(
  recommendations: RecommendationBoard["category_groups"][number]["recommendations"],
  options: { openQuestion?: string } = {},
): RecommendationBoard {
  return {
    session_summary: "Austin family and business scenario.",
    headline: "Useful BXN people to consider",
    total_recommendations: recommendations.length,
    category_groups:
      recommendations.length === 0
        ? []
        : [
            {
              category_key: "home_services",
              category_label: "Home Services",
              category_summary: "Help around the home.",
              recommendations,
            },
          ],
    open_questions: options.openQuestion
      ? [
          {
            question: options.openQuestion,
            why_it_matters: "It could change which members are most relevant.",
            priority: "high",
          },
        ]
      : [],
  };
}

function recommendation(
  overrides: Partial<
    RecommendationBoard["category_groups"][number]["recommendations"][number]
  > = {},
): RecommendationBoard["category_groups"][number]["recommendations"][number] {
  return {
    member_id: "member-1",
    full_name: "Miguel Escobedo",
    business_name: "Austin Build Co.",
    phone: null,
    email: null,
    profile_url: null,
    need_key: "general_contractor",
    need_label: "General Contractor",
    match_type: "exact",
    display_tier: "recommended",
    reason: "Experienced with residential remodeling.",
    evidence: ["Residential remodeling experience."],
    service_area_note: "Serves Austin.",
    network_note: null,
    score: 94,
    ...overrides,
  };
}
