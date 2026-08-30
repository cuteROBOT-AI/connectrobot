import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CONNECTROBOT_THINKING_ACTIVITIES } from "../../src/app/connectrobot/thinking.js";

describe("ConnectROBOT v0.1 UX polish", () => {
  it("uses the refined primary conversation heading while preserving the BXN eyebrow", () => {
    const component = readFileSync("src/app/connectrobot/ConversationPane.tsx", "utf8");

    expect(component).toContain("BXN ConnectROBOT");
    expect(component).toContain("What’s going on?");
    expect(component).not.toContain("Who can we help today?");
  });

  it("uses the approved rotating thinking activity states", () => {
    expect(CONNECTROBOT_THINKING_ACTIVITIES).toEqual([
      {
        title: "Understanding the situation…",
        description: "Identifying the kinds of help that may be useful.",
      },
      {
        title: "Connecting the needs…",
        description: "Looking for related services, expertise, and support.",
      },
      {
        title: "Exploring the BXN network…",
        description: "Finding members whose experience fits the situation.",
      },
      {
        title: "Looking for strong matches…",
        description: "Comparing who is most relevant to each need.",
      },
      {
        title: "Considering the bigger picture…",
        description: "Checking for useful connections across multiple needs.",
      },
      {
        title: "Refining the referral mix…",
        description: "Balancing the strongest direct and supporting options.",
      },
      {
        title: "Building your referral plan…",
        description: "Organizing the most useful introductions for you.",
      },
    ]);
  });

  it("rotates one activity message without presenting measured backend progress", () => {
    const component = readFileSync("src/app/connectrobot/ConversationPane.tsx", "utf8");
    const styles = readFileSync("src/styles/connectrobot.css", "utf8");

    expect(component).toContain("CONNECTROBOT_THINKING_ACTIVITIES[activityIndex]");
    expect(component).toContain("setInterval");
    expect(component).toContain("% CONNECTROBOT_THINKING_ACTIVITIES.length");
    expect(component).not.toContain("connectrobot-thinking-step");
    expect(component).not.toContain("Made thoughtfully by cuteROBOT + Omi.");
    expect(styles).not.toMatch(/percent|complete|progress/i);
  });

  it("keeps the network animation as continuous ambient activity", () => {
    const component = readFileSync("src/app/connectrobot/ConversationPane.tsx", "utf8");
    const styles = readFileSync("src/styles/connectrobot.css", "utf8");

    expect(component).not.toContain("stage-understanding");
    expect(component).not.toContain("stage-network");
    expect(component).not.toContain("stage-plan");
    expect(styles).toContain("connectrobot-link-flow 2.7s ease-in-out infinite");
    expect(styles).toContain("connectrobot-node-pulse 2.7s ease-in-out infinite");
    expect(component).toContain('src="/connectROBOT_mark_solid.svg"');
    expect(component).not.toContain("className=\"omi-mark\"");
  });

  it("places the Omi mark as a static asset hub without the old framed inner panel", () => {
    const component = readFileSync("src/app/connectrobot/ConversationPane.tsx", "utf8");
    const styles = readFileSync("src/styles/connectrobot.css", "utf8");
    const asset = readFileSync("public/connectROBOT_mark_solid.svg", "utf8");

    expect(asset).toContain("<svg");
    expect(component).toContain("connectrobot-omi-hub");
    expect(component).toContain("connectrobot-network-stage");
    expect(component).not.toContain("border border-[#e1d7bc] bg-[#f8f5ed]");
    expect(styles).toContain("height: 14rem");
    expect(styles).toContain("height: 68%");
    expect(styles).toContain("width: 68%");
    expect(styles).toContain("width: clamp(1rem, 13.5%, 1.9rem)");
  });

  it("keeps the submit action inside the composer field", () => {
    const component = readFileSync("src/app/connectrobot/ConversationPane.tsx", "utf8");

    expect(component).toContain('onSubmit={submitMessage} className="relative"');
    expect(component).toContain("pb-14 pr-14");
    expect(component).toContain("absolute right-3 top-1/2 size-10 -translate-y-1/2");
    expect(component).toContain("event.currentTarget.form?.requestSubmit()");
  });

  it("keeps also-consider results collapsed behind a quiet disclosure by default", () => {
    const source = readFileSync("src/app/connectrobot/RecommendationBoard.tsx", "utf8");

    expect(source).toContain("Also consider ·");
    expect(source).toContain("expandedSecondaryGroups[group.category_key]");
  });

  it("makes Text my recommendations the dominant handoff action", () => {
    const source = readFileSync("src/app/connectrobot/RecommendationBoard.tsx", "utf8");
    const textActionIndex = source.indexOf("Text my recommendations");
    const exportActionIndex = source.indexOf("Export referral plan PDF");

    expect(textActionIndex).toBeGreaterThan(-1);
    expect(exportActionIndex).toBeGreaterThan(-1);
    expect(textActionIndex).toBeLessThan(exportActionIndex);
  });

  it("supports reduced-motion users in the network thinking animation", () => {
    const source = readFileSync("src/styles/connectrobot.css", "utf8");
    const component = readFileSync("src/app/connectrobot/ConversationPane.tsx", "utf8");

    expect(source).toContain("@media (prefers-reduced-motion: reduce)");
    expect(source).toContain("animation: none");
    expect(component).toContain("if (prefersReducedMotion)");
  });
});
