import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  parseJsonBody,
} from "../networking-dna/http.js";
import { readNetworkingDnaEnv } from "../../server/networking-dna/env.js";
import { createNetworkingDnaSupabaseClient } from "../../server/networking-dna/supabase.js";
import {
  SupabaseReferralPlanRepository,
  createSnapshotResponse,
} from "../../server/connectrobot/referral-plan-repository.js";
import type { ReferralPlanSnapshotResponse } from "../../server/connectrobot/referral-plan-schemas.js";

export {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  parseJsonBody,
};

export function createReferralPlanRepository(): SupabaseReferralPlanRepository {
  const env = readNetworkingDnaEnv();
  return new SupabaseReferralPlanRepository(createNetworkingDnaSupabaseClient(env));
}

export function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export function referralPlanResponse(
  result: Parameters<typeof createSnapshotResponse>[0],
  request: Request,
): ReferralPlanSnapshotResponse {
  return createSnapshotResponse(result, getRequestOrigin(request));
}
