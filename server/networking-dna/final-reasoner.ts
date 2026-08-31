import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { resolveBxnProfileUrl } from "../connectrobot/member-profile.js";
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
      reasoning: { effort: "minimal" },
      input: [
        {
          role: "system",
          content: FINAL_REASONER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify({
            structured_context: input.context,
            authoritative_scorer_results: input.candidates.map(stripPresentationMetadata),
          }),
        },
      ],
      text: {
        verbosity: "low",
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
            phone: candidate.phone ?? null,
            email: candidate.email ?? null,
            profile_url: resolveBxnProfileUrl(candidate.full_name, candidate.profile_url),
            need_key: candidate.need_key,
            need_label: recommendation.need_label || humanizeNeedKey(candidate.need_key),
            match_type: candidate.match_type,
            display_tier: displayTier,
            reason: sanitizeUserFacingText(
              recommendation.reason || candidate.why_matched,
              fallbackRecommendationReason(candidate),
            ),
            evidence: sanitizeEvidence(recommendation.evidence),
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
    open_questions: board.open_questions
      .filter(isMaterialRecommendationQuestion)
      .slice(0, 3),
  };

  return RecommendationBoardSchema.parse(groundedBoard);
}

function sanitizeEvidence(evidence: string[]): string[] {
  const sanitized = evidence.flatMap((item) =>
    item
      .split(/(?:[.;]\s+|;\s*)/)
      .map((segment) => segment.replace(/[.;]+$/, "").trim())
      .filter((segment) => segment.length > 0)
      .filter((segment) => !containsInternalScorerTerminology(segment)),
  );

  return [...new Set(sanitized)];
}

function sanitizeUserFacingText(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const sanitized = sanitizeEvidence([value]).join(". ");
  return sanitized || fallback;
}

function containsInternalScorerTerminology(value: string): boolean {
  return /\b(?:grounded|candidate|candidates|scorer|score|need[_\s-]*fit[_\s-]*score|context[_\s-]*fit[_\s-]*score|service[_\s-]*area[_\s-]*score|referral[_\s-]*network[_\s-]*score|inference[_\s-]*confidence|inferred\s+need|match[_\s-]*type|match[_\s-]*basis|display[_\s-]*tier|ranking|(?:exact|direct|adjacent)\s+match)\b/i.test(
    value,
  );
}

function isMaterialRecommendationQuestion(
  question: RecommendationBoard["open_questions"][number],
): boolean {
  const text = `${question.question} ${question.why_it_matters}`.toLowerCase();
  if (/\b(?:general consultation|consultation|intake|discovery call|talk to someone|learn more)\b/.test(text)) {
    return false;
  }

  if (/\b(?:taxonomy|candidate|candidates|recommendation|recommendations|rank|ranking|referral|referrals|need|needs|service|services|area|location|industry|home|property|business|teen|driver|financial|tax|bookkeeping|banking|it|automation|roof|hvac|pest|inspection|contractor)\b/.test(text)) {
    return true;
  }

  return false;
}

function buildCandidateProfileEvidence(candidate: CandidateScorerResult): string[] {
  const evidence = [
    candidate.primary_category ? `Profile category: ${candidate.primary_category}` : null,
    candidate.business_name ? `Business profile: ${candidate.business_name}` : null,
  ];

  return evidence.filter((item): item is string => Boolean(item));
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
      category_summary: `BXN members to consider for ${categoryLabel(categoryKey).toLowerCase()} needs.`,
      recommendations: [],
    };

    const displayTier: "recommended" | "also_consider" =
      candidate.match_type === "adjacent" ? "also_consider" : "recommended";

    group.recommendations.push({
      member_id: candidate.member_id,
      full_name: candidate.full_name,
      business_name: candidate.business_name,
      phone: candidate.phone ?? null,
      email: candidate.email ?? null,
      profile_url: resolveBxnProfileUrl(candidate.full_name, candidate.profile_url),
      need_key: candidate.need_key,
      need_label: humanizeNeedKey(candidate.need_key),
      match_type: candidate.match_type,
      display_tier: displayTier,
      reason: sanitizeUserFacingText(
        candidate.why_matched || candidate.match_basis,
        fallbackRecommendationReason(candidate),
      ),
      evidence: buildCandidateProfileEvidence(candidate),
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
        ? "BXN referrals to consider"
        : "No strong BXN matches yet",
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
    headline: "No strong BXN matches yet",
    total_recommendations: 0,
    category_groups: [],
    open_questions: context.unknowns.slice(0, 3).map((unknown, index) => ({
      question: questionFromUnknown(unknown),
      why_it_matters: "The answer could materially change which BXN members appear on the board.",
      priority: index === 0 ? "high" : "medium",
    })),
  };
}

function fallbackRecommendationReason(candidate: CandidateScorerResult): string {
  const needLabel = formatNeedLabelForSentence(humanizeNeedKey(candidate.need_key));
  return `This BXN member's services appear relevant for ${needLabel}.`;
}

function formatNeedLabelForSentence(needLabel: string): string {
  return needLabel
    .split(" ")
    .map((word) => (/^[A-Z0-9&/-]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ");
}

function candidateKey(memberId: string, needKey: string): string {
  return `${memberId}:${needKey}`;
}

function stripPresentationMetadata(candidate: CandidateScorerResult): CandidateScorerResult {
  const {
    phone: _phone,
    email: _email,
    profile_url: _profileUrl,
    ...reasoningCandidate
  } = candidate;

  return reasoningCandidate;
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
  "Keep the numeric score field for internal sorting, but never restate scores in user-facing prose or evidence.",
  "Do not expose raw scorer terminology, scoring formulas, or score components in user-facing prose or evidence.",
  "Evidence must be natural grounded facts from member/profile data only: services, specialties, relevant experience, geography, profile facts, or service-area facts.",
  "Do not use the user's scenario itself as evidence; use reason to briefly connect member/profile facts to the scenario.",
  "Do not include phrases such as Scorer: exact, Total score, need_fit_score, context_fit_score, service_area_score, referral_network_score, match_type, or inference_confidence in evidence.",
  "Use exact and direct matches as recommended unless there is an explicit grounding reason not to.",
  "Use adjacent matches as also_consider unless there is an explicit grounding reason not to.",
  "Return an open question only when its answer could materially change which current taxonomy needs or candidates appear, or how those candidates rank.",
  "Returning fewer than three open questions is better than filling the quota with generic consultation or intake questions.",
  "Preserve uncertainty and avoid claiming inferred needs are confirmed facts.",
].join("\n");
