import networkingDnaMessage from "../networking-dna/session-message.js";

import { forwardToProtectedNetworkingDnaEndpoint } from "./proxy.js";

export default {
  async fetch(request: Request) {
    const sessionId = extractProxySessionId(request.url);
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Session id is required" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    return forwardToProtectedNetworkingDnaEndpoint(
      request,
      `/api/networking-dna/session/${encodeURIComponent(sessionId)}/message`,
      networkingDnaMessage.fetch,
    );
  },
};

export function extractProxySessionId(url: string): string | null {
  const parsedUrl = new URL(url);
  const match = parsedUrl.pathname.match(
    /^\/api\/connectrobot\/session\/([^/]+)\/message\/?$/,
  );
  if (match?.[1]) return decodeURIComponent(match[1]);

  return parsedUrl.searchParams.get("id");
}
