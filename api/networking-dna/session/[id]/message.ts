import { processNetworkingDnaMessage } from "../../../../server/networking-dna/pipeline";
import { NetworkingDnaMessageRequestSchema } from "../../../../server/networking-dna/schemas";
import {
  createAuthorizedPipeline,
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  parseJsonBody,
} from "../../http";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return methodNotAllowed();
    }

    try {
      const authorized = createAuthorizedPipeline(request);
      if ("response" in authorized) return authorized.response;

      const sessionId = extractSessionId(request.url);
      if (!sessionId) {
        return jsonResponse({ error: "Session id is required" }, 400);
      }

      const body = NetworkingDnaMessageRequestSchema.parse(await parseJsonBody(request));
      const result = await processNetworkingDnaMessage(
        sessionId,
        body.message,
        authorized.pipeline,
      );

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(error);
    }
  },
};

export function extractSessionId(url: string): string | null {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/^\/api\/networking-dna\/session\/([^/]+)\/message\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
