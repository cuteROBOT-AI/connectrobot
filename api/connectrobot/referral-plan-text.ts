import { normalizeUsPhone } from "../../server/connectrobot/contact.js";
import { TextReferralPlanRequestSchema } from "../../server/connectrobot/referral-plan-schemas.js";
import {
  TelnyxSmsDeliveryService,
  buildReferralPlanSmsText,
} from "../../server/connectrobot/sms.js";
import { readNetworkingDnaEnv } from "../../server/networking-dna/env.js";
import {
  createReferralPlanRepository,
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  parseJsonBody,
  referralPlanResponse,
} from "./handoff.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return methodNotAllowed();

    try {
      const env = readNetworkingDnaEnv();
      if (!env.TELNYX_API_KEY || !env.TELNYX_FROM_NUMBER) {
        return jsonResponse({ error: "Telnyx SMS is not configured" }, 500);
      }

      const body = TextReferralPlanRequestSchema.parse(await parseJsonBody(request));
      const normalizedPhone = normalizeUsPhone(body.phone);
      const repository = createReferralPlanRepository();
      const contactId = await repository.upsertSessionContact({
        session_id: body.session_id,
        name: body.name,
        phone: normalizedPhone,
      });
      const snapshot = await repository.createOrReuseSnapshot(body.session_id, contactId);
      const response = referralPlanResponse(snapshot, request);

      await new TelnyxSmsDeliveryService(
        env.TELNYX_API_KEY,
        env.TELNYX_FROM_NUMBER,
      ).send({
        to: normalizedPhone,
        text: buildReferralPlanSmsText({
          name: body.name,
          snapshotUrl: response.snapshot_url,
        }),
      });

      return jsonResponse({ ...response, sent: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
