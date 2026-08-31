import type { RecommendationBoardData } from "./types";
import {
  buildPresentedCategoryGroups,
  type PresentedRecommendation,
} from "./presentation";

const INTERNAL_RECOMMENDATION_TERMINOLOGY_PATTERN =
  /\b(?:grounded\s+(?:bxn\s+)?(?:referral\s+)?candidates?|scorer|total[_\s-]*score|need[_\s-]*fit[_\s-]*score|context[_\s-]*fit[_\s-]*score|service[_\s-]*area[_\s-]*score|referral[_\s-]*network[_\s-]*score|inference[_\s-]*confidence|inferred[_\s-]*need|match[_\s-]*basis|match[_\s-]*type|display[_\s-]*tier|(?:scorer|internal|candidate|candidates|recommendation|recommendations|referral|member|members|need|needs|match|matches|score)\s+ranking|ranking\s+(?:logic|mechanics|algorithm|signal|signals|score|scores)|(?:exact|direct|adjacent)\s+match)\b/i;

export function sanitizeBoardHeadline(
  headline: string | null | undefined,
  totalRecommendations: number,
): string {
  if (headline && !INTERNAL_RECOMMENDATION_TERMINOLOGY_PATTERN.test(headline)) {
    return headline.trim();
  }

  return totalRecommendations > 0 ? "BXN referrals to consider" : "No strong BXN matches yet";
}

export function sanitizeCategorySummary(value: string | null | undefined): string {
  if (!value || INTERNAL_RECOMMENDATION_TERMINOLOGY_PATTERN.test(value)) return "";
  return value.trim();
}

export function sanitizeRecommendationText(value: string | null | undefined): string {
  if (!value || INTERNAL_RECOMMENDATION_TERMINOLOGY_PATTERN.test(value)) return "";
  return value.trim();
}

export function sanitizeRecommendationEvidence(evidence: string[]): string[] {
  return evidence
    .map((item) => sanitizeRecommendationText(item))
    .filter((item) => item.length > 0);
}

export function formatRecommendationBoardAsText(
  board: RecommendationBoardData | null,
  savedPlanUrl?: string | null,
): string {
  if (!board || board.total_recommendations === 0) {
    return "ConnectROBOT recommendation board\n\nNo recommendations yet.";
  }

  const lines = [
    "ConnectROBOT recommendation board",
    "",
    sanitizeBoardHeadline(board.headline, board.total_recommendations),
    board.session_summary ? `Scenario: ${board.session_summary}` : "",
    savedPlanUrl ? `Saved plan: ${savedPlanUrl}` : "",
  ].filter(Boolean);

  for (const group of buildPresentedCategoryGroups(board)) {
    if (group.recommendations.length === 0) continue;

    lines.push("", group.category_label);
    const categorySummary = sanitizeCategorySummary(group.category_summary);
    if (categorySummary) lines.push(categorySummary);

    for (const recommendation of group.recommendations) {
      const reason = sanitizeRecommendationText(recommendation.reason);
      const evidence = sanitizeRecommendationEvidence(recommendation.evidence);
      const serviceAreaNotes = sanitizeRecommendationEvidence(
        recommendation.service_area_notes,
      );
      const networkNotes = sanitizeRecommendationEvidence(recommendation.network_notes);
      const tier =
        recommendation.display_tier === "recommended"
          ? "Recommended"
          : "Also consider";
      lines.push(
        "",
        `${tier}: ${recommendation.full_name}`,
        recommendation.business_name ? `Business: ${recommendation.business_name}` : "",
        `Capabilities: ${recommendation.need_labels.join(", ")}`,
        reason ? `Why: ${reason}` : "",
      );

      const contactLines = buildContactLines(recommendation);
      if (contactLines.length > 0) {
        lines.push("Contact:", ...contactLines);
      }

      if (evidence.length > 0) {
        lines.push("Evidence:");
        for (const item of evidence) {
          lines.push(`- ${item}`);
        }
      }

      if (serviceAreaNotes.length > 0) {
        lines.push(`Service area: ${serviceAreaNotes.join("; ")}`);
      }

      if (networkNotes.length > 0) {
        lines.push(`Network note: ${networkNotes.join("; ")}`);
      }
    }
  }

  return lines.filter(Boolean).join("\n");
}

function buildContactLines(recommendation: PresentedRecommendation): string[] {
  return [
    recommendation.phone ? `- Phone: ${recommendation.phone}` : "",
    recommendation.email ? `- Email: ${recommendation.email}` : "",
  ].filter(Boolean);
}
