import { createNetworkingDnaSession } from "../../server/networking-dna/pipeline.js";
import { NetworkingDnaCreateSessionRequestSchema } from "../../server/networking-dna/schemas.js";
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

      const body = NetworkingDnaCreateSessionRequestSchema.parse(await parseJsonBody(request));
      const result = await createNetworkingDnaSession(
        authorized.pipeline.repository,
        body.initial_summary,
      );

      return jsonResponse(result, 201);
    } catch (error) {
      return errorResponse(error);
    }
  },
};
