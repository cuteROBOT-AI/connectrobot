import { describe, expect, it, vi } from "vitest";

import { buildDeterministicBoard } from "../../server/networking-dna/final-reasoner.js";
import { processNetworkingDnaMessage } from "../../server/networking-dna/pipeline.js";
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
});
