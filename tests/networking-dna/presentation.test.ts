import { describe, expect, it } from "vitest";

import {
  buildPresentedCategoryGroups,
  getChangedPresentedMemberIds,
  getProfileHref,
  getNeedPresentationLabel,
  splitPresentedRecommendationsByTier,
} from "../../src/app/connectrobot/presentation.js";
import type { RecommendationBoardData } from "../../src/app/connectrobot/types.js";

describe("ConnectROBOT recommendation presentation helpers", () => {
  it("consolidates repeated members while preserving matched capabilities", () => {
    const board = buildBoard([
      recommendation({
        member_id: "member-1",
        need_key: "general_contractor",
        need_label: "General Contractor",
      }),
      recommendation({
        member_id: "member-1",
        need_key: "roofing",
        need_label: "Roofing",
        display_tier: "also_consider",
      }),
      recommendation({
        member_id: "member-2",
        full_name: "Christopher Gaydos",
        need_key: "home_inspection",
        need_label: "Home Inspection",
      }),
    ]);

    const groups = buildPresentedCategoryGroups(board);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.recommendations).toHaveLength(2);
    expect(groups[0]?.recommendations[0]?.need_labels).toEqual([
      "General Contractor",
      "Roofing",
    ]);
    expect(groups[0]?.recommendations[0]?.display_tier).toBe("recommended");
  });

  it("reports newly added or materially changed presented members", () => {
    const previous = buildBoard([
      recommendation({
        member_id: "member-1",
        need_key: "general_contractor",
        need_label: "General Contractor",
      }),
    ]);
    const next = buildBoard([
      recommendation({
        member_id: "member-1",
        need_key: "general_contractor",
        need_label: "General Contractor",
      }),
      recommendation({
        member_id: "member-2",
        need_key: "home_inspection",
        need_label: "Home Inspection",
      }),
    ]);

    expect(getChangedPresentedMemberIds(previous, next)).toEqual(["member-2"]);
  });

  it("uses explicit profile URLs only", () => {
    const [group] = buildPresentedCategoryGroups(
      buildBoard([
        recommendation({
          member_id: "member-1",
          profile_url: "https://example.com/member/member-1",
        }),
      ]),
    );
    const [recommendationWithUrl] = group?.recommendations ?? [];

    expect(recommendationWithUrl && getProfileHref(recommendationWithUrl)).toBe(
      "https://example.com/member/member-1",
    );

    const [groupWithoutProfile] = buildPresentedCategoryGroups(
      buildBoard([recommendation({ member_id: "member-1" })]),
    );
    const [recommendationWithoutProfile] = groupWithoutProfile?.recommendations ?? [];

    expect(
      recommendationWithoutProfile && getProfileHref(recommendationWithoutProfile),
    ).toBeNull();
  });

  it("splits recommended and also-consider presentation tiers", () => {
    const [group] = buildPresentedCategoryGroups(
      buildBoard([
        recommendation({ member_id: "recommended-1" }),
        recommendation({
          member_id: "secondary-1",
          display_tier: "also_consider",
          full_name: "Secondary Member",
        }),
        recommendation({
          member_id: "secondary-2",
          display_tier: "also_consider",
          full_name: "Another Secondary Member",
        }),
      ]),
    );

    const tiers = splitPresentedRecommendationsByTier(group?.recommendations ?? []);

    expect(tiers.recommended.map((item) => item.member_id)).toEqual([
      "recommended-1",
    ]);
    expect(tiers.alsoConsider.map((item) => item.member_id)).toEqual([
      "secondary-1",
      "secondary-2",
    ]);
  });

  it("renders human-readable capability labels while preserving taxonomy keys", () => {
    const original = recommendation({
      need_key: "general_contractor",
      need_label: "general_contractor",
    });
    const board = buildBoard([original]);
    const [group] = buildPresentedCategoryGroups(board);

    expect(getNeedPresentationLabel(original)).toBe("General Contractor");
    expect(group?.recommendations[0]?.need_labels).toEqual(["General Contractor"]);
    expect(group?.recommendations[0]?.recommendations[0]?.need_key).toBe(
      "general_contractor",
    );
    expect(group?.recommendations[0]?.recommendations[0]?.need_label).toBe(
      "general_contractor",
    );
  });

  it("humanizes unmapped canonical-looking capability labels", () => {
    expect(
      getNeedPresentationLabel(
        recommendation({
          need_key: "estate_planning",
          need_label: "estate_planning",
        }),
      ),
    ).toBe("Estate Planning");
  });
});

function buildBoard(recommendations: RecommendationBoardData["category_groups"][number]["recommendations"]): RecommendationBoardData {
  return {
    session_summary: "A family bought a home.",
    headline: "BXN referral candidates for this scenario",
    total_recommendations: recommendations.length,
    category_groups: [
      {
        category_key: "home_property",
        category_label: "Home & Property",
        category_summary: "Home referrals.",
        recommendations,
      },
    ],
    open_questions: [],
  };
}

function recommendation(
  overrides: Partial<
    RecommendationBoardData["category_groups"][number]["recommendations"][number]
  >,
): RecommendationBoardData["category_groups"][number]["recommendations"][number] {
  return {
    member_id: "member-1",
    full_name: "Nancy Dominguez",
    business_name: "Seven-S Contractor Services",
    need_key: "general_contractor",
    need_label: "General Contractor",
    display_tier: "recommended",
    reason: "Relevant contractor profile for a home project.",
    evidence: ["General contractor services"],
    service_area_note: null,
    network_note: null,
    score: 96,
    ...overrides,
  };
}
