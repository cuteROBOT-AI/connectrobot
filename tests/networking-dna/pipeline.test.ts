import { describe, expect, it, vi } from "vitest";

import { buildDeterministicBoard } from "../../server/networking-dna/final-reasoner.js";
import {
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
    expect(response.assistant_message).toContain("grounded BXN referral candidates");
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
