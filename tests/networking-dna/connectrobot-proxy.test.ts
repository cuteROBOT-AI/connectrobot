import { describe, expect, it, vi } from "vitest";

import { extractProxySessionId } from "../../api/connectrobot/session-message.js";
import { forwardToProtectedNetworkingDnaEndpoint } from "../../api/connectrobot/proxy.js";

describe("ConnectROBOT browser-safe proxy", () => {
  it("extracts the session id from public proxy message routes", () => {
    expect(
      extractProxySessionId("https://example.com/api/connectrobot/session/session-123/message"),
    ).toBe("session-123");
    expect(
      extractProxySessionId("https://example.com/api/connectrobot/session-message?id=session-123"),
    ).toBe("session-123");
  });

  it("adds the protected API key only inside the server-side proxy", async () => {
    vi.stubEnv("NETWORKING_DNA_API_KEY", "server-secret");
    const handler = vi.fn(async (request: Request) => {
      expect(request.url).toBe("https://example.com/api/networking-dna/session");
      expect(request.headers.get("authorization")).toBe("Bearer server-secret");
      expect(await request.json()).toEqual({ initial_summary: "" });
      return new Response(JSON.stringify({ session_id: "session-123" }));
    });

    const response = await forwardToProtectedNetworkingDnaEndpoint(
      new Request("https://example.com/api/connectrobot/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ initial_summary: "" }),
      }),
      "/api/networking-dna/session",
      handler,
    );

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
