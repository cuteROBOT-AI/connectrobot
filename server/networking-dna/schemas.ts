import { z } from "zod/v4";

export const MatchTypeSchema = z.enum(["exact", "direct", "adjacent"]);
export const DisplayTierSchema = z.enum(["recommended", "also_consider"]);
export const NeedCategorySchema = z.enum([
  "home_property",
  "business_growth",
  "financial_professional",
  "family_lifestyle",
  "health_wellness",
  "other",
]);

export const NetworkingDnaMessageRequestSchema = z.object({
  message: z.string().trim().min(1).max(10_000),
});

export const NetworkingDnaCreateSessionRequestSchema = z
  .object({
    initial_summary: z.string().trim().max(1_000).optional(),
  })
  .default({});

export const ScenarioContextSchema = z.object({
  scenario_summary: z.string(),
  observed: z.object({
    location: z.object({
      city: z.string().nullable(),
      region: z.string().nullable(),
      state: z.string().nullable(),
      new_to_area: z.boolean().nullable(),
    }),
    household: z.object({
      household_type: z.string().nullable(),
      adults: z.number().nullable(),
      children: z.number().nullable(),
      child_stages: z.array(z.string()),
    }),
    property: z.object({
      present: z.boolean(),
      property_type: z.string().nullable(),
      value: z.number().nullable(),
      recent_purchase: z.boolean().nullable(),
      needs_work: z.boolean().nullable(),
      commercial: z.boolean().nullable(),
    }),
    business: z.object({
      present: z.boolean(),
      owner_in_household: z.boolean().nullable(),
      stage: z.string().nullable(),
      industry: z.string().nullable(),
      employees: z.number().nullable(),
    }),
    explicit_needs: z.array(z.string()),
    life_events: z.array(z.string()),
    constraints: z.array(z.string()),
  }),
  inferred_needs: z.array(
    z.object({
      need: z.string(),
      category: NeedCategorySchema,
      importance: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
      supported_by: z.array(z.string()),
    }),
  ),
  unknowns: z.array(z.string()),
});

export const CandidateScorerResultSchema = z.object({
  need_key: z.string(),
  result_category: z.string(),
  importance: z.number(),
  inference_confidence: z.number(),
  member_id: z.string(),
  full_name: z.string(),
  business_name: z.string().nullable(),
  primary_category: z.string().nullable(),
  match_type: MatchTypeSchema,
  match_basis: z.string().nullable(),
  total_score: z.number(),
  need_fit_score: z.number().optional(),
  context_fit_score: z.number().optional(),
  service_area_score: z.number().optional(),
  referral_network_score: z.number().optional(),
  why_matched: z.string().nullable(),
});

export const CandidateScorerResultsSchema = z.array(CandidateScorerResultSchema);

export const RecommendationSchema = z.object({
  member_id: z.string(),
  full_name: z.string(),
  business_name: z.string().nullable(),
  need_key: z.string(),
  need_label: z.string(),
  match_type: MatchTypeSchema,
  display_tier: DisplayTierSchema,
  reason: z.string(),
  evidence: z.array(z.string()),
  service_area_note: z.string().nullable(),
  network_note: z.string().nullable(),
  score: z.number(),
});

export const RecommendationBoardSchema = z.object({
  session_summary: z.string(),
  headline: z.string(),
  total_recommendations: z.number().int().min(0),
  category_groups: z.array(
    z.object({
      category_key: z.string(),
      category_label: z.string(),
      category_summary: z.string(),
      recommendations: z.array(RecommendationSchema),
    }),
  ),
  open_questions: z.array(
    z.object({
      question: z.string(),
      why_it_matters: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
});

export const NetworkingDnaResponseSchema = z.object({
  session_id: z.string(),
  assistant_message: z.string(),
  structured_context: ScenarioContextSchema,
  recommendation_board: RecommendationBoardSchema,
  open_questions: RecommendationBoardSchema.shape.open_questions,
});

export const ConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  created_at: z.string().optional().nullable(),
});

export const NetworkingSessionRowSchema = z.object({
  id: z.string(),
  current_summary: z.string().nullable().optional(),
  current_structured_context: z.unknown().nullable().optional(),
  current_recommendations: z.unknown().nullable().optional(),
});

export type NetworkingDnaMessageRequest = z.infer<typeof NetworkingDnaMessageRequestSchema>;
export type ScenarioContext = z.infer<typeof ScenarioContextSchema>;
export type CandidateScorerResult = z.infer<typeof CandidateScorerResultSchema>;
export type RecommendationBoard = z.infer<typeof RecommendationBoardSchema>;
export type NetworkingDnaResponse = z.infer<typeof NetworkingDnaResponseSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type NetworkingSessionRow = z.infer<typeof NetworkingSessionRowSchema>;

export function createEmptyScenarioContext(summary = ""): ScenarioContext {
  return {
    scenario_summary: summary,
    observed: {
      location: { city: null, region: null, state: null, new_to_area: null },
      household: { household_type: null, adults: null, children: null, child_stages: [] },
      property: {
        present: false,
        property_type: null,
        value: null,
        recent_purchase: null,
        needs_work: null,
        commercial: null,
      },
      business: {
        present: false,
        owner_in_household: null,
        stage: null,
        industry: null,
        employees: null,
      },
      explicit_needs: [],
      life_events: [],
      constraints: [],
    },
    inferred_needs: [],
    unknowns: [],
  };
}
