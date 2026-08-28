import { z } from "zod/v4";

import { RecommendationBoardSchema } from "../networking-dna/schemas.js";

export const CreateReferralPlanSnapshotRequestSchema = z.object({
  session_id: z.string().uuid(),
});

export const TextReferralPlanRequestSchema = z.object({
  session_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(7).max(32),
});

export const ReferralPlanSnapshotPayloadSchema = z.object({
  session_id: z.string().uuid(),
  scenario_summary: z.string(),
  headline: z.string(),
  recommendation_board: RecommendationBoardSchema,
  created_at: z.string(),
});

export const ReferralPlanSnapshotRowSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  public_token: z.string().min(24),
  board_fingerprint: z.string().min(32),
  snapshot: ReferralPlanSnapshotPayloadSchema,
  created_at: z.string(),
  created_by_contact_id: z.string().uuid().nullable().optional(),
});

export const ReferralPlanSnapshotResponseSchema = z.object({
  token: z.string(),
  snapshot_url: z.string(),
  pdf_url: z.string(),
  snapshot: ReferralPlanSnapshotPayloadSchema,
  created_at: z.string(),
  reused: z.boolean(),
});

export type CreateReferralPlanSnapshotRequest = z.infer<
  typeof CreateReferralPlanSnapshotRequestSchema
>;
export type TextReferralPlanRequest = z.infer<typeof TextReferralPlanRequestSchema>;
export type ReferralPlanSnapshotPayload = z.infer<
  typeof ReferralPlanSnapshotPayloadSchema
>;
export type ReferralPlanSnapshotRow = z.infer<typeof ReferralPlanSnapshotRowSchema>;
export type ReferralPlanSnapshotResponse = z.infer<
  typeof ReferralPlanSnapshotResponseSchema
>;
