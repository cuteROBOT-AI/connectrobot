import {
  CreateReferralPlanSnapshotRequestSchema,
  ReferralPlanSnapshotResponseSchema,
} from "../../server/connectrobot/referral-plan-schemas.js";
import {
  createReferralPlanRepository,
  errorResponse,
  getRequestOrigin,
  jsonResponse,
  methodNotAllowed,
  parseJsonBody,
  referralPlanResponse,
} from "./handoff.js";

export default {
  async fetch(request: Request) {
    try {
      if (request.method === "POST") {
        const body = CreateReferralPlanSnapshotRequestSchema.parse(
          await parseJsonBody(request),
        );
        const result = await createReferralPlanRepository().createOrReuseSnapshot(
          body.session_id,
        );
        return jsonResponse(
          ReferralPlanSnapshotResponseSchema.parse(
            referralPlanResponse(result, request),
          ),
          result.reused ? 200 : 201,
        );
      }

      if (request.method === "GET") {
        const token = extractReferralPlanToken(request.url);
        if (!token) return jsonResponse({ error: "Referral plan token is required" }, 400);

        const snapshot = await createReferralPlanRepository().findSnapshotByToken(token);
        if (!snapshot) return jsonResponse({ error: "Referral plan not found" }, 404);

        return jsonResponse(
          ReferralPlanSnapshotResponseSchema.parse({
            token: snapshot.public_token,
            snapshot_url: new URL(`/r/${snapshot.public_token}`, getRequestOrigin(request)).toString(),
            pdf_url: new URL(
              `/api/connectrobot/referral-plan/${snapshot.public_token}/pdf`,
              getRequestOrigin(request),
            ).toString(),
            snapshot: snapshot.snapshot,
            created_at: snapshot.created_at,
            reused: true,
          }),
        );
      }

      return methodNotAllowed();
    } catch (error) {
      return errorResponse(error);
    }
  },
};

export function extractReferralPlanToken(url: string): string | null {
  const parsedUrl = new URL(url);
  const match = parsedUrl.pathname.match(
    /^\/api\/connectrobot\/referral-plan\/([^/]+)\/?$/,
  );
  if (match?.[1]) return decodeURIComponent(match[1]);

  return parsedUrl.searchParams.get("token");
}
