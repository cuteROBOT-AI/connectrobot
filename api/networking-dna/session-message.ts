import { processNetworkingDnaMessage } from "../../server/networking-dna/pipeline.js";
import type { NetworkingDnaMessageTimingStage } from "../../server/networking-dna/pipeline.js";
import { NetworkingDnaMessageRequestSchema } from "../../server/networking-dna/schemas.js";
import {
  createAuthorizedPipeline,
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  parseJsonBody,
} from "./http.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return methodNotAllowed();
    }

    const startedAt = performance.now();
    const timings = createEmptyMessageTimings();
    let sessionId: string | null = null;
    let status = 500;
    let outcome: "success" | "error" = "error";

    try {
      const authorized = createAuthorizedPipeline(request);
      if ("response" in authorized) {
        const response = authorized.response;
        status = response.status;
        return response;
      }

      sessionId = extractSessionId(request.url);
      if (!sessionId) {
        const response = jsonResponse({ error: "Session id is required" }, 400);
        status = response.status;
        return response;
      }

      const body = NetworkingDnaMessageRequestSchema.parse(await parseJsonBody(request));
      const result = await processNetworkingDnaMessage(
        sessionId,
        body.message,
        authorized.pipeline,
        {
          onTiming(stage, elapsedMs) {
            timings[stage] += elapsedMs;
          },
        },
      );

      const response = jsonResponse(result);
      status = response.status;
      outcome = "success";
      return response;
    } catch (error) {
      const response = errorResponse(error);
      status = response.status;
      return response;
    } finally {
      logMessagePipelineTiming({
        sessionId,
        status,
        outcome,
        timings,
        totalRequestMs: performance.now() - startedAt,
      });
    }
  },
};

type MessageTimings = Record<NetworkingDnaMessageTimingStage, number>;

function createEmptyMessageTimings(): MessageTimings {
  return {
    session_history_retrieval: 0,
    scenario_interpreter: 0,
    scenario_upsert: 0,
    preview_referral_candidates: 0,
    final_reasoner: 0,
    session_message_persistence: 0,
  };
}

function logMessagePipelineTiming({
  sessionId,
  status,
  outcome,
  timings,
  totalRequestMs,
}: {
  sessionId: string | null;
  status: number;
  outcome: "success" | "error";
  timings: MessageTimings;
  totalRequestMs: number;
}): void {
  console.info(
    JSON.stringify({
      event: "networking_dna.message_pipeline.timing",
      session_id: sessionId,
      status,
      outcome,
      timings_ms: {
        session_history_retrieval: roundElapsedMs(timings.session_history_retrieval),
        scenario_interpreter: roundElapsedMs(timings.scenario_interpreter),
        scenario_upsert: roundElapsedMs(timings.scenario_upsert),
        preview_referral_candidates: roundElapsedMs(timings.preview_referral_candidates),
        final_reasoner: roundElapsedMs(timings.final_reasoner),
        session_message_persistence: roundElapsedMs(timings.session_message_persistence),
        total_request: roundElapsedMs(totalRequestMs),
      },
    }),
  );
}

function roundElapsedMs(elapsedMs: number): number {
  return Math.round(elapsedMs);
}

export function extractSessionId(url: string): string | null {
  const parsedUrl = new URL(url);
  const match = parsedUrl.pathname.match(
    /^\/api\/networking-dna\/session\/([^/]+)\/message\/?$/,
  );
  if (match?.[1]) return decodeURIComponent(match[1]);

  return parsedUrl.searchParams.get("id");
}
