import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface VercelConfig {
  rewrites?: Array<{
    source: string;
    destination: string;
  }>;
}

describe("Vercel routing", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig;

  it("routes dynamic ConnectROBOT API endpoints to static Vercel Function targets", () => {
    expect(config.rewrites?.[0]).toEqual({
      source: "/api/connectrobot/session/:id/message",
      destination: "/api/connectrobot/session-message?id=:id",
    });
    expect(config.rewrites?.[1]).toEqual({
      source: "/api/connectrobot/referral-plan/text",
      destination: "/api/connectrobot/referral-plan-text",
    });
    expect(config.rewrites?.[2]).toEqual({
      source: "/api/connectrobot/referral-plan/:token/pdf",
      destination: "/api/connectrobot/referral-plan-pdf?token=:token",
    });
    expect(config.rewrites?.[3]).toEqual({
      source: "/api/connectrobot/referral-plan/:token",
      destination: "/api/connectrobot/referral-plan?token=:token",
    });
    expect(config.rewrites?.[4]).toEqual({
      source: "/api/networking-dna/session/:id/message",
      destination: "/api/networking-dna/session-message?id=:id",
    });
  });

  it("keeps API requests out of the Vite SPA fallback", () => {
    const fallback = config.rewrites?.at(-1);

    expect(fallback).toEqual({
      source: "/((?!api(?:/|$)).*)",
      destination: "/index.html",
    });
    expect(config.rewrites).not.toContainEqual({
      source: "/(.*)",
      destination: "/index.html",
    });
  });
});
