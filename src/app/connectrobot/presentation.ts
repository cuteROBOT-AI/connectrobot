import type {
  Recommendation,
  RecommendationBoardData,
  RecommendationCategoryGroup,
} from "./types";

export interface PresentedRecommendation {
  member_id: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  profile_url: string | null;
  display_tier: Recommendation["display_tier"];
  recommendations: Recommendation[];
  need_labels: string[];
  reason: string;
  evidence: string[];
  service_area_notes: string[];
  network_notes: string[];
  fingerprint: string;
}

export interface PresentedCategoryGroup
  extends Omit<RecommendationCategoryGroup, "recommendations"> {
  recommendations: PresentedRecommendation[];
}

export interface PresentedRecommendationTiers {
  recommended: PresentedRecommendation[];
  alsoConsider: PresentedRecommendation[];
}

const NEED_PRESENTATION_LABELS: Record<string, string> = {
  ai_automation: "AI Automation",
  bookkeeping: "Bookkeeping",
  business_banking: "Business Banking",
  driver_education: "Driver Education",
  financial_planning: "Financial Planning",
  general_contractor: "General Contractor",
  home_inspection: "Home Inspection",
  hvac: "HVAC",
  managed_it: "Managed IT",
  pest_control: "Pest Control",
  roofing: "Roofing",
  tax_strategy: "Tax Strategy",
};

export function buildPresentedCategoryGroups(
  board: RecommendationBoardData | null,
): PresentedCategoryGroup[] {
  if (!board) return [];

  const groups = board.category_groups.map((group) => ({
    ...group,
    recommendations: [] as PresentedRecommendation[],
  }));
  const groupByKey = new Map(groups.map((group) => [group.category_key, group]));
  const presentedByMember = new Map<string, PresentedRecommendation>();

  for (const group of board.category_groups) {
    for (const recommendation of group.recommendations) {
      const existing = presentedByMember.get(recommendation.member_id);
      if (existing) {
        mergeRecommendation(existing, recommendation);
        continue;
      }

      const presented = createPresentedRecommendation(recommendation);
      presentedByMember.set(recommendation.member_id, presented);
      groupByKey.get(group.category_key)?.recommendations.push(presented);
    }
  }

  for (const recommendation of presentedByMember.values()) {
    recommendation.fingerprint = getPresentedRecommendationFingerprint(recommendation);
  }

  return groups.filter((group) => group.recommendations.length > 0);
}

export function getPresentedRecommendationFingerprints(
  board: RecommendationBoardData | null,
): Map<string, string> {
  return new Map(
    buildPresentedCategoryGroups(board).flatMap((group) =>
      group.recommendations.map((recommendation) => [
        recommendation.member_id,
        recommendation.fingerprint,
      ]),
    ),
  );
}

export function getChangedPresentedMemberIds(
  previousBoard: RecommendationBoardData | null,
  nextBoard: RecommendationBoardData,
): string[] {
  const previous = getPresentedRecommendationFingerprints(previousBoard);
  const next = getPresentedRecommendationFingerprints(nextBoard);

  return [...next.entries()]
    .filter(([memberId, fingerprint]) => previous.get(memberId) !== fingerprint)
    .map(([memberId]) => memberId);
}

export function getProfileHref(recommendation: PresentedRecommendation): string | null {
  if (recommendation.profile_url) return recommendation.profile_url;
  return null;
}

export function splitPresentedRecommendationsByTier(
  recommendations: PresentedRecommendation[],
): PresentedRecommendationTiers {
  return {
    recommended: recommendations.filter(
      (recommendation) => recommendation.display_tier === "recommended",
    ),
    alsoConsider: recommendations.filter(
      (recommendation) => recommendation.display_tier === "also_consider",
    ),
  };
}

export function getNeedPresentationLabel(recommendation: Recommendation): string {
  const mapped = NEED_PRESENTATION_LABELS[recommendation.need_key];
  if (mapped) return mapped;

  const label = recommendation.need_label.trim();
  if (label && !isCanonicalKeyLike(label)) return label;

  return humanizeNeedKey(label || recommendation.need_key);
}

function createPresentedRecommendation(
  recommendation: Recommendation,
): PresentedRecommendation {
  return {
    member_id: recommendation.member_id,
    full_name: recommendation.full_name,
    business_name: recommendation.business_name,
    phone: recommendation.phone ?? null,
    email: recommendation.email ?? null,
    profile_url: recommendation.profile_url ?? null,
    display_tier: recommendation.display_tier,
    recommendations: [recommendation],
    need_labels: [getNeedPresentationLabel(recommendation)],
    reason: recommendation.reason,
    evidence: uniqueStrings(recommendation.evidence),
    service_area_notes: uniqueNullableStrings([recommendation.service_area_note]),
    network_notes: uniqueNullableStrings([recommendation.network_note]),
    fingerprint: "",
  };
}

function mergeRecommendation(
  presented: PresentedRecommendation,
  recommendation: Recommendation,
) {
  presented.recommendations.push(recommendation);
  presented.need_labels = uniqueStrings([
    ...presented.need_labels,
    getNeedPresentationLabel(recommendation),
  ]);
  presented.evidence = uniqueStrings([...presented.evidence, ...recommendation.evidence]);
  presented.service_area_notes = uniqueStrings([
    ...presented.service_area_notes,
    ...uniqueNullableStrings([recommendation.service_area_note]),
  ]);
  presented.network_notes = uniqueStrings([
    ...presented.network_notes,
    ...uniqueNullableStrings([recommendation.network_note]),
  ]);

  if (!presented.business_name && recommendation.business_name) {
    presented.business_name = recommendation.business_name;
  }
  if (!presented.phone && recommendation.phone) presented.phone = recommendation.phone;
  if (!presented.email && recommendation.email) presented.email = recommendation.email;
  if (!presented.profile_url && recommendation.profile_url) {
    presented.profile_url = recommendation.profile_url;
  }
  if (
    presented.display_tier === "also_consider" &&
    recommendation.display_tier === "recommended"
  ) {
    presented.display_tier = "recommended";
    presented.reason = recommendation.reason || presented.reason;
  }
}

function getPresentedRecommendationFingerprint(
  recommendation: PresentedRecommendation,
): string {
  return JSON.stringify({
    member_id: recommendation.member_id,
    business_name: recommendation.business_name,
    display_tier: recommendation.display_tier,
    need_labels: recommendation.need_labels,
    reason: recommendation.reason,
    evidence: recommendation.evidence,
    service_area_notes: recommendation.service_area_notes,
    network_notes: recommendation.network_notes,
    phone: recommendation.phone,
    email: recommendation.email,
    profile_url: recommendation.profile_url,
  });
}

function uniqueNullableStrings(values: Array<string | null | undefined>): string[] {
  return uniqueStrings(values.filter((value): value is string => Boolean(value)));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isCanonicalKeyLike(value: string): boolean {
  return /^[a-z0-9_]+$/.test(value);
}

function humanizeNeedKey(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => {
      if (part.toLowerCase() === "it") return "IT";
      if (part.toLowerCase() === "ai") return "AI";
      if (part.toLowerCase() === "hvac") return "HVAC";
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}
