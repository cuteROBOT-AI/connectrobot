import { renderReferralPlanPdf } from "../../server/connectrobot/referral-plan-pdf.js";
import {
  createReferralPlanRepository,
  errorResponse,
  jsonResponse,
  methodNotAllowed,
} from "./handoff.js";
import { extractReferralPlanToken } from "./referral-plan.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") return methodNotAllowed();

    try {
      const token = extractReferralPlanToken(request.url);
      if (!token) return jsonResponse({ error: "Referral plan token is required" }, 400);

      const snapshot = await createReferralPlanRepository().findSnapshotByToken(token);
      if (!snapshot) return jsonResponse({ error: "Referral plan not found" }, 404);

      const pdf = await renderReferralPlanPdf(snapshot.snapshot);
      const body = pdf.buffer.slice(
        pdf.byteOffset,
        pdf.byteOffset + pdf.byteLength,
      ) as ArrayBuffer;

      return new Response(body, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="connectrobot-referral-plan-${snapshot.public_token.slice(0, 8)}.pdf"`,
          "cache-control": "private, max-age=0, must-revalidate",
        },
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
