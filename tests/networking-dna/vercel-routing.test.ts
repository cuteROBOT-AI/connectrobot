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

  it("routes the public message endpoint to a static Vercel Function target", () => {
    expect(config.rewrites?.[0]).toEqual({
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
