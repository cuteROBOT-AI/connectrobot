import { ZodError } from "zod/v4";

import { isAuthorizedNetworkingDnaRequest, readNetworkingDnaEnv } from "../../server/networking-dna/env.js";
import { createDefaultNetworkingDnaPipeline } from "../../server/networking-dna/service.js";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function methodNotAllowed(): Response {
  return jsonResponse({ error: "Method not allowed" }, 405);
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Request body must be valid JSON");
  }
}

export function createAuthorizedPipeline(request: Request) {
  const apiKey = process.env.NETWORKING_DNA_API_KEY;
  if (!apiKey) {
    return {
      response: jsonResponse({ error: "NETWORKING_DNA_API_KEY is not configured" }, 500),
    } as const;
  }

  if (!isAuthorizedNetworkingDnaRequest(request.headers, apiKey)) {
    return {
      response: jsonResponse({ error: "Unauthorized" }, 401),
    } as const;
  }

  const env = readNetworkingDnaEnv();
  return { pipeline: createDefaultNetworkingDnaPipeline(env) } as const;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return jsonResponse({ error: "Invalid request", details: error.issues }, 400);
  }

  if (error instanceof Error && error.message === "Request body must be valid JSON") {
    return jsonResponse({ error: error.message }, 400);
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return jsonResponse({ error: message }, 500);
}
