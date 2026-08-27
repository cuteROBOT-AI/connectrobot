import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  RecommendationBoardSchema,
  type CandidateScorerResult,
  type RecommendationBoard,
  type ScenarioContext,
} from "./schemas.js";

export interface FinalReasonerInput {
  context: ScenarioContext;
  candidates: CandidateScorerResult[];
}

export interface FinalReasoner {
  buildBoard(input: FinalReasonerInput): Promise<RecommendationBoard>;
}

export class OpenAIFinalReasoner implements FinalReasoner {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async buildBoard(input: FinalReasonerInput): Promise<RecommendationBoard> {
    if (input.candidates.length === 0) {
      return buildEmptyBoard(input.context);
    }

    const response = await this.client.responses.parse({
      model: this.model,
      input: [
        {
          role: "system",
          content: FINAL_REASONER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify({
            structured_context: input.context,
            authoritative_scorer_results: input.candidates,
          }),
        },
      ],
      text: {
        format: zodTextFormat(RecommendationBoardSchema, "networking_dna_referral_board"),
      },
    });

    if (!response.output_parsed) {
      throw new Error("Final Reasoner returned no parsed recommendation board");
    }

    return enforceCandidateGrounding(
      RecommendationBoardSchema.parse(response.output_parsed),
      input.context,
      input.candidates,
    );
  }
}

export function enforceCandidateGrounding(
  board: RecommendationBoard,
  context: ScenarioContext,
  candidates: CandidateScorerResult[],
): RecommendationBoard {
  const byKey = new Map(
    candidates.map((candidate, index) => [
      candidateKey(candidate.member_id, candidate.need_key),
      { candidate, index },
    ]),
  );

  const categoryGroups = board.category_groups
    .map((group) => {
      const recommendations = group.recommendations
        .map((recommendation) => {
          const grounded = byKey.get(candidateKey(recommendation.member_id, recommendation.need_key));
          if (!grounded) return null;

          const { candidate, index } = grounded;
          const displayTier: "recommended" | "also_consider" =
            candidate.match_type === "adjacent" ? "also_consider" : "recommended";

          return {
            ...recommendation,
            member_id: candidate.member_id,
            full_name: candidate.full_name,
            business_name: candidate.business_name,
            need_key: candidate.need_key,
            need_label: recommendation.need_label || humanizeNeedKey(candidate.need_key),
            match_type: candidate.match_type,
            display_tier: displayTier,
            reason: recommendation.reason || candidate.why_matched || "Matched by the BXN scorer.",
            score: candidate.total_score,
            __scorerIndex: index,
          };
        })
        .filter((recommendation): recommendation is NonNullable<typeof recommendation> =>
          Boolean(recommendation),
        )
        .sort((left, right) => left.__scorerIndex - right.__scorerIndex)
        .map(({ __scorerIndex: _index, ...recommendation }) => recommendation);

      return { ...group, recommendations };
    })
    .filter((group) => group.recommendations.length > 0);

  const groundedBoard: RecommendationBoard = {
    ...board,
    session_summary: board.session_summary || context.scenario_summary,
    category_groups: categoryGroups,
    total_recommendations: categoryGroups.reduce(
      (total, group) => total + group.recommendations.length,
      0,
    ),
    open_questions: board.open_questions.slice(0, 3),
  };

  return RecommendationBoardSchema.parse(groundedBoard);
}

export function buildDeterministicBoard(
  context: ScenarioContext,
  candidates: CandidateScorerResult[],
): RecommendationBoard {
  const groups = new Map<
    string,
    {
      category_key: string;
      category_label: string;
      category_summary: string;
      recommendations: RecommendationBoard["category_groups"][number]["recommendations"];
    }
  >();

  for (const candidate of candidates) {
    const categoryKey = String(candidate.result_category || "other");
    const group = groups.get(categoryKey) ?? {
      category_key: categoryKey,
      category_label: categoryLabel(categoryKey),
      category_summary: `Grounded BXN candidates for ${categoryLabel(categoryKey).toLowerCase()} needs.`,
      recommendations: [],
    };

    const displayTier: "recommended" | "also_consider" =
      candidate.match_type === "adjacent" ? "also_consider" : "recommended";

    group.recommendations.push({
      member_id: candidate.member_id,
      full_name: candidate.full_name,
      business_name: candidate.business_name,
      need_key: candidate.need_key,
      need_label: humanizeNeedKey(candidate.need_key),
      match_type: candidate.match_type,
      display_tier: displayTier,
      reason: candidate.why_matched || candidate.match_basis || "Matched by the BXN scorer.",
      evidence: candidate.match_basis ? [candidate.match_basis] : [],
      service_area_note: null,
      network_note: null,
      score: candidate.total_score,
    });

    groups.set(categoryKey, group);
  }

  const categoryGroups = [...groups.values()];

  return RecommendationBoardSchema.parse({
    session_summary: context.scenario_summary,
    headline:
      categoryGroups.length > 0
        ? "BXN referral candidates for this scenario"
        : "No grounded BXN referral candidates yet",
    total_recommendations: candidates.length,
    category_groups: categoryGroups,
    open_questions: context.unknowns.slice(0, 3).map((unknown, index) => ({
      question: questionFromUnknown(unknown),
      why_it_matters: "The answer could materially change which BXN members appear on the board.",
      priority: index === 0 ? "high" : "medium",
    })),
  });
}

function buildEmptyBoard(context: ScenarioContext): RecommendationBoard {
  return {
    session_summary: context.scenario_summary,
    headline: "No grounded BXN referral candidates yet",
    total_recommendations: 0,
    category_groups: [],
    open_questions: context.unknowns.slice(0, 3).map((unknown, index) => ({
      question: questionFromUnknown(unknown),
      why_it_matters: "The answer could materially change which BXN members appear on the board.",
      priority: index === 0 ? "high" : "medium",
    })),
  };
}

function candidateKey(memberId: string, needKey: string): string {
  return `${memberId}:${needKey}`;
}

function humanizeNeedKey(needKey: string): string {
  return needKey
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function categoryLabel(categoryKey: string): string {
  const labels: Record<string, string> = {
    home_property: "Home & Property",
    business_growth: "Business Growth",
    financial_professional: "Financial & Professional",
    family_lifestyle: "Family & Lifestyle",
    health_wellness: "Health & Wellness",
    other: "Other",
  };
  return labels[categoryKey] ?? humanizeNeedKey(categoryKey);
}

function questionFromUnknown(unknown: string): string {
  const trimmed = unknown.trim();
  if (trimmed.endsWith("?")) return trimmed;
  return `Can you clarify ${trimmed.toLowerCase()}?`;
}

const FINAL_REASONER_SYSTEM_PROMPT = [
  "You are the Final Reasoner for BXN Networking DNA.",
  "The scorer results are authoritative for candidate selection and ranking.",
  "Do not invent BXN members, businesses, services, relationships, or scores.",
  "Only transform grounded scorer candidates into the referral board schema.",
  "Do not expose internal scoring formulas or score components in user-facing prose.",
  "Use exact and direct matches as recommended unless there is an explicit grounding reason not to.",
  "Use adjacent matches as also_consider unless there is an explicit grounding reason not to.",
  "Return up to three open questions only when the answer could materially change the referral list.",
  "Preserve uncertainty and avoid claiming inferred needs are confirmed facts.",
].join("\n");
