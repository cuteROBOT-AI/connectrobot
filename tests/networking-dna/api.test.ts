import { describe, expect, it } from "vitest";

import {
  getBearerToken,
  isAuthorizedNetworkingDnaRequest,
} from "../../server/networking-dna/env.js";
import { extractSessionId } from "../../api/networking-dna/session/[id]/message.js";

describe("Networking DNA API helpers", () => {
  it("accepts either bearer or shared-secret header auth", () => {
    expect(getBearerToken("Bearer secret")).toBe("secret");
    expect(
      isAuthorizedNetworkingDnaRequest(
        new Headers({ authorization: "Bearer secret" }),
        "secret",
      ),
    ).toBe(true);
    expect(
      isAuthorizedNetworkingDnaRequest(
        new Headers({ "x-networking-dna-api-key": "secret" }),
        "secret",
      ),
    ).toBe(true);
    expect(
      isAuthorizedNetworkingDnaRequest(
        new Headers({ authorization: "Bearer wrong" }),
        "secret",
      ),
    ).toBe(false);
  });

  it("extracts the dynamic session id from the message endpoint path", () => {
    expect(
      extractSessionId("https://example.com/api/networking-dna/session/session-123/message"),
    ).toBe("session-123");
    expect(
      extractSessionId(
        "https://example.com/api/networking-dna/session/session%20with%20space/message",
      ),
    ).toBe("session with space");
    expect(extractSessionId("https://example.com/api/networking-dna/session")).toBeNull();
  });
});
