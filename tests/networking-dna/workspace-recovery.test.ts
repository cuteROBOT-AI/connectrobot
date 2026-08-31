import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getRecommendationUpdateFailureMessage } from "../../src/app/connectrobot/ConnectRobotWorkspace.js";

describe("ConnectROBOT failed recommendation update recovery", () => {
  it("uses calm recovery copy for failed first requests", () => {
    expect(getRecommendationUpdateFailureMessage(false)).toBe(
      "I had trouble building the referral plan. Please try that again.",
    );
  });

  it("uses board-preserving recovery copy for failed updates", () => {
    expect(getRecommendationUpdateFailureMessage(true)).toBe(
      "I had trouble updating the referral plan. Your current recommendations are still here. Please try that again.",
    );
  });

  it("does not render raw backend errors in a separate composer banner", () => {
    const workspace = readFileSync("src/app/connectrobot/ConnectRobotWorkspace.tsx", "utf8");
    const pane = readFileSync("src/app/connectrobot/ConversationPane.tsx", "utf8");

    expect(workspace).not.toContain("setError");
    expect(workspace).not.toContain("caught.message");
    expect(workspace).not.toContain("I’m having trouble reaching the recommendation service.");
    expect(pane).not.toContain("error:");
    expect(pane).not.toContain("{error}");
  });

  it("preserves board state and retry readiness in the failure path", () => {
    const workspace = readFileSync("src/app/connectrobot/ConnectRobotWorkspace.tsx", "utf8");
    const catchBlock = workspace.slice(
      workspace.indexOf("} catch {"),
      workspace.indexOf("} finally {"),
    );
    const finallyBlock = workspace.slice(
      workspace.indexOf("} finally {"),
      workspace.indexOf("function handleNewConversation()"),
    );

    expect(catchBlock).toContain("getRecommendationUpdateFailureMessage(Boolean(board))");
    expect(catchBlock).not.toMatch(/setBoard|setOpenQuestions|setSavedSnapshot/);
    expect(finallyBlock).toContain("setIsSending(false)");
  });
});
