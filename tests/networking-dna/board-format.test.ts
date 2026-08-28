import { describe, expect, it } from "vitest";

import { formatRecommendationBoardAsText } from "../../src/app/connectrobot/format-board.js";
import type { RecommendationBoardData } from "../../src/app/connectrobot/types.js";

describe("ConnectROBOT recommendation board copy formatting", () => {
  it("formats the board as readable text without exposing internal scores", () => {
    const board: RecommendationBoardData = {
      session_summary: "A family moved to Austin and bought a home that needs work.",
      headline: "BXN referral candidates for this scenario",
      total_recommendations: 1,
      category_groups: [
        {
          category_key: "home_property",
          category_label: "Home & Property",
          category_summary: "Grounded home-property referrals.",
          recommendations: [
            {
              member_id: "member-1",
              full_name: "Nancy Dominguez",
              business_name: "Seven-S Contractor Services",
              phone: "512-555-0142",
              email: "nancy@example.com",
              need_key: "general_contractor",
              need_label: "General Contractor",
              display_tier: "recommended",
              reason: "Relevant contractor profile for a home project.",
              evidence: [
                "General contractor services",
                "Scorer: exact; Total score 96; need_fit_score 40",
                "Austin-area profile",
              ],
              service_area_note: "Serves the Austin area.",
              network_note: null,
              score: 96,
            },
            {
              member_id: "member-1",
              full_name: "Nancy Dominguez",
              business_name: "Seven-S Contractor Services",
              need_key: "roofing",
              need_label: "Roofing",
              display_tier: "recommended",
              reason: "Roofing can be part of the same home project.",
              evidence: ["Exterior remodeling support"],
              service_area_note: null,
              network_note: null,
              score: 92,
            },
          ],
        },
      ],
      open_questions: [],
    };

    const text = formatRecommendationBoardAsText(board);

    expect(text).toContain("Recommended: Nancy Dominguez");
    expect(text).toContain("Business: Seven-S Contractor Services");
    expect(text).toContain("Capabilities: General Contractor, Roofing");
    expect(text).toContain("- Phone: 512-555-0142");
    expect(text).toContain("- Email: nancy@example.com");
    expect(text).toContain("- General contractor services");
    expect(text).toContain("- Austin-area profile");
    expect(text.match(/Recommended: Nancy Dominguez/g)).toHaveLength(1);
    expect(text).not.toContain("96");
    expect(text).not.toMatch(/score|need_fit_score|Scorer/i);
  });

  it("returns a useful empty-board copy state", () => {
    expect(formatRecommendationBoardAsText(null)).toBe(
      "ConnectROBOT recommendation board\n\nNo recommendations yet.",
    );
  });
});
