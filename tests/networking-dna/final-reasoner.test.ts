import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import {
  OpenAIFinalReasoner,
  buildDeterministicBoard,
  enforceCandidateGrounding,
} from "../../server/networking-dna/final-reasoner.js";
import {
  CandidateScorerResultsSchema,
  RecommendationBoardSchema,
  ScenarioContextSchema,
} from "../../server/networking-dna/schemas.js";
import fixture from "./fixtures/austin-family-business.json";

describe("Final Reasoner grounding", () => {
  const context = ScenarioContextSchema.parse(fixture.structured_context);
  const candidates = CandidateScorerResultsSchema.parse(fixture.scorer_results);

  it("builds a board from scorer candidates without changing scorer order", () => {
    const board = buildDeterministicBoard(context, candidates);

    expect(board.total_recommendations).toBe(candidates.length);
    expect(board.category_groups[0]?.recommendations.map((item) => item.full_name)).toEqual([
      "Nancy Dominguez",
      "Christopher Gaydos",
      "AIRSTRIKE",
    ]);
    expect(
      board.category_groups.flatMap((group) =>
        group.recommendations.map((recommendation) => recommendation.business_name),
      ),
    ).toContain("Jungle Driving School");
  });

  it("strips invented recommendations and restores scorer-authored candidate fields", () => {
    const ungroundedBoard = RecommendationBoardSchema.parse({
      session_summary: context.scenario_summary,
      headline: "Draft",
      total_recommendations: 2,
      category_groups: [
        {
          category_key: "home_property",
          category_label: "Home & Property",
          category_summary: "Draft",
          recommendations: [
            {
              member_id: candidates[0].member_id,
              full_name: "Wrong Name",
              business_name: "Wrong Business",
              need_key: candidates[0].need_key,
              need_label: "General Contractor",
              match_type: "adjacent",
              display_tier: "also_consider",
              reason: "Draft",
              evidence: [],
              service_area_note: null,
              network_note: null,
              score: 1,
            },
            {
              member_id: "invented",
              full_name: "Invented Person",
              business_name: "Invented Co",
              need_key: "invented_need",
              need_label: "Invented",
              match_type: "exact",
              display_tier: "recommended",
              reason: "Draft",
              evidence: [],
              service_area_note: null,
              network_note: null,
              score: 100,
            },
          ],
        },
      ],
      open_questions: [
        { question: "One?", why_it_matters: "Because.", priority: "high" },
        { question: "Two?", why_it_matters: "Because.", priority: "medium" },
        { question: "Three?", why_it_matters: "Because.", priority: "low" },
        { question: "Four?", why_it_matters: "Because.", priority: "low" },
      ],
    });

    const grounded = enforceCandidateGrounding(ungroundedBoard, context, candidates);
    const recommendation = grounded.category_groups[0]?.recommendations[0];

    expect(grounded.total_recommendations).toBe(1);
    expect(recommendation?.full_name).toBe("Nancy Dominguez");
    expect(recommendation?.business_name).toBe("Seven-S Contractor Services");
    expect(recommendation?.match_type).toBe("exact");
    expect(recommendation?.display_tier).toBe("recommended");
    expect(recommendation?.score).toBe(96);
    expect(grounded.open_questions).toHaveLength(3);
  });

  it("requests low-latency Responses API behavior while preserving structured output", async () => {
    const board = buildDeterministicBoard(context, candidates);
    const parse = vi.fn(async () => ({ output_parsed: board }));
    const client = { responses: { parse } } as unknown as OpenAI;
    const finalReasoner = new OpenAIFinalReasoner(client, "current-final-model");

    await finalReasoner.buildBoard({ context, candidates });

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "current-final-model",
        reasoning: { effort: "minimal" },
        text: expect.objectContaining({
          verbosity: "low",
          format: expect.any(Object),
        }),
      }),
    );
  });
});
