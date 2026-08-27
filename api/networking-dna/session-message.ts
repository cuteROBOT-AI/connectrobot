import { processNetworkingDnaMessage } from "../../server/networking-dna/pipeline.js";
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
  const parsedUrl = new URL(url);
  const match = parsedUrl.pathname.match(
    /^\/api\/networking-dna\/session\/([^/]+)\/message\/?$/,
  );
  if (match?.[1]) return decodeURIComponent(match[1]);

  return parsedUrl.searchParams.get("id");
}
