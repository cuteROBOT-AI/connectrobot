import type { RecommendationBoardData } from "./types";
import {
  buildPresentedCategoryGroups,
  type PresentedRecommendation,
} from "./presentation";

const INTERNAL_SCORER_PATTERN =
  /\b(?:scorer|total score|score|need[_\s-]*fit[_\s-]*score|context[_\s-]*fit[_\s-]*score|service[_\s-]*area[_\s-]*score)\b/i;

export function sanitizeRecommendationText(value: string | null | undefined): string {
  if (!value || INTERNAL_SCORER_PATTERN.test(value)) return "";
  return value.trim();
}

export function sanitizeRecommendationEvidence(evidence: string[]): string[] {
  return evidence
    .map((item) => sanitizeRecommendationText(item))
    .filter((item) => item.length > 0);
}

export function formatRecommendationBoardAsText(
  board: RecommendationBoardData | null,
): string {
  if (!board || board.total_recommendations === 0) {
    return "ConnectROBOT recommendation board\n\nNo recommendations yet.";
  }

  const lines = [
    "ConnectROBOT recommendation board",
    "",
    board.headline,
    board.session_summary ? `Scenario: ${board.session_summary}` : "",
  ].filter(Boolean);

  for (const group of buildPresentedCategoryGroups(board)) {
    if (group.recommendations.length === 0) continue;

    lines.push("", group.category_label);
    if (group.category_summary) lines.push(group.category_summary);

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
