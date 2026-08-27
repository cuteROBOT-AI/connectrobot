import { describe, expect, it } from "vitest";

import {
  CANONICAL_REFERRAL_NEED_KEYS,
  ScenarioContextSchema,
} from "../../server/networking-dna/schemas.js";
import fixture from "./fixtures/austin-family-business.json";

describe("Networking DNA scenario schema", () => {
  it("accepts only canonical referral taxonomy need keys", () => {
    const context = ScenarioContextSchema.parse(fixture.structured_context);

    expect(context.inferred_needs.map((need) => need.need)).toEqual([
      "general_contractor",
      "driver_education",
      "business_banking",
    ]);
  });

  it("rejects arbitrary prose need names", () => {
    const invalidContext = structuredClone(fixture.structured_context);
    invalidContext.inferred_needs[0].need =
      "General contractors and remodeling specialists for home renovation projects";

    expect(() => ScenarioContextSchema.parse(invalidContext)).toThrow();
  });

  it("keeps the benchmark-relevant POC keys available to the interpreter", () => {
    expect(CANONICAL_REFERRAL_NEED_KEYS).toEqual(
      expect.arrayContaining([
        "general_contractor",
        "home_inspection",
        "hvac",
        "pest_control",
        "roofing",
        "driver_education",
        "bookkeeping",
        "business_banking",
        "managed_it",
        "ai_automation",
        "financial_planning",
        "tax_strategy",
      ]),
    );
  });
});
