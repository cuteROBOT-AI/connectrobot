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

    expect(board.headline).toBe("BXN referrals to consider");
    expect(board.category_groups[0]?.category_summary).toBe(
      "BXN members to consider for home & property needs.",
    );
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
        {
          question: "What kind of home work is most urgent?",
          why_it_matters: "It could change which home-property referral needs rank highest.",
          priority: "high",
        },
        {
          question: "What industry is the business in?",
          why_it_matters: "It could change which business candidates rank highest.",
          priority: "medium",
        },
        {
          question: "Are the teenagers learning to drive?",
          why_it_matters: "It could change whether driver education appears.",
          priority: "low",
        },
        {
          question: "Would they like a general consultation?",
          why_it_matters: "Because.",
          priority: "low",
        },
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

  it("removes scorer/debug terminology from user-facing evidence", () => {
    const candidate = candidates[0];
    const board = RecommendationBoardSchema.parse({
      session_summary: context.scenario_summary,
      headline: "Draft",
      total_recommendations: 1,
      category_groups: [
        {
          category_key: "home_property",
          category_label: "Home & Property",
          category_summary: "Draft",
          recommendations: [
            {
              member_id: candidate.member_id,
              full_name: candidate.full_name,
              business_name: candidate.business_name,
              need_key: candidate.need_key,
              need_label: "General Contractor",
              match_type: "exact",
              display_tier: "recommended",
              reason: "Scorer: exact; Total score: 96",
              evidence: [
                "Services include home renovation and remodeling.",
                "Scorer: exact; Total score: 96; need_fit_score: 99",
                "Serves Austin-area homeowners; context_fit_score: 94",
                "Exact match for general_contractor.",
              ],
              service_area_note: null,
              network_note: null,
              score: 1,
            },
          ],
        },
      ],
      open_questions: [
        {
          question: "Would they like a consultation?",
          why_it_matters: "Generic intake completeness.",
          priority: "low",
        },
      ],
    });

    const grounded = enforceCandidateGrounding(board, context, candidates);
    const recommendation = grounded.category_groups[0]?.recommendations[0];

    expect(recommendation?.score).toBe(candidate.total_score);
    expect(recommendation?.reason).toBe(
      "This BXN member's services appear relevant for general contractor.",
    );
    expect(recommendation?.evidence).toEqual([
      "Services include home renovation and remodeling",
      "Serves Austin-area homeowners",
    ]);
    expect(JSON.stringify(recommendation?.evidence)).not.toMatch(
      /grounded|candidate|Scorer|score|need_fit_score|context_fit_score|service_area_score|exact match|match basis|inferred need|ranking|match type/i,
    );
    expect(grounded.open_questions).toEqual([]);
  });

  it("uses natural zero-result board copy", () => {
    const board = buildDeterministicBoard(context, []);

    expect(board.headline).toBe("No strong BXN matches yet");
    expect(board.total_recommendations).toBe(0);
    expect(JSON.stringify(board)).not.toMatch(
      /No grounded BXN referral candidates yet|Grounded BXN referral candidate/i,
    );
  });

  it("requests low-latency Responses API behavior while preserving structured output", async () => {
    const board = buildDeterministicBoard(context, candidates);
    const parse = vi.fn(async (_request: unknown) => ({ output_parsed: board }));
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
    const request = parse.mock.calls[0]?.[0] as {
      input: Array<{ content: string }>;
    };
    expect(request?.input[0]).toEqual(
      expect.objectContaining({
        content: expect.stringContaining("Evidence must be natural grounded facts from member/profile data only"),
      }),
    );
    expect(request?.input[0]).toEqual(
      expect.objectContaining({
        content: expect.stringContaining("Do not use the user's scenario itself as evidence"),
      }),
    );
    expect(request?.input[0]).toEqual(
      expect.objectContaining({
        content: expect.stringContaining("Returning fewer than three open questions is better"),
      }),
    );
  });
});
