import { describe, expect, it, vi } from "vitest";

import {
  REFERRAL_PLAN_LINK_FAILURE_LABEL,
  copyReferralPlanLink,
} from "../../src/app/connectrobot/RecommendationBoard.js";
import type { ReferralPlanSnapshotResponse } from "../../src/app/connectrobot/types.js";

describe("ConnectROBOT Get Link action", () => {
  it("creates or reuses a snapshot and copies the public referral-plan URL", async () => {
    const snapshot = referralPlanSnapshot({
      snapshot_url: "https://bxn.connectrobot.app/r/token-one",
      reused: false,
    });
    const createSnapshot = vi.fn(async () => snapshot);
    const writeClipboard = vi.fn(async () => undefined);
    const onSnapshotCreated = vi.fn();

    await expect(
      copyReferralPlanLink({
        sessionId: "session-one",
        createSnapshot,
        writeClipboard,
        onSnapshotCreated,
      }),
    ).resolves.toBe(snapshot);

    expect(createSnapshot).toHaveBeenCalledWith("session-one");
    expect(writeClipboard).toHaveBeenCalledWith("https://bxn.connectrobot.app/r/token-one");
    expect(onSnapshotCreated).toHaveBeenCalledWith(snapshot);
  });

  it("preserves same-board snapshot reuse from the snapshot response", async () => {
    const snapshot = referralPlanSnapshot({
      snapshot_url: "https://bxn.connectrobot.app/r/reused-token",
      reused: true,
    });
    const createSnapshot = vi.fn(async () => snapshot);
    const writeClipboard = vi.fn(async () => undefined);

    await copyReferralPlanLink({
      sessionId: "session-one",
      createSnapshot,
      writeClipboard,
      onSnapshotCreated: vi.fn(),
    });
    await copyReferralPlanLink({
      sessionId: "session-one",
      createSnapshot,
      writeClipboard,
      onSnapshotCreated: vi.fn(),
    });

    expect(writeClipboard).toHaveBeenNthCalledWith(
      1,
      "https://bxn.connectrobot.app/r/reused-token",
    );
    expect(writeClipboard).toHaveBeenNthCalledWith(
      2,
      "https://bxn.connectrobot.app/r/reused-token",
    );
  });

  it("copies the snapshot URL for a changed-board snapshot response", async () => {
    const firstSnapshot = referralPlanSnapshot({
      snapshot_url: "https://bxn.connectrobot.app/r/token-one",
      reused: false,
    });
    const changedSnapshot = referralPlanSnapshot({
      snapshot_url: "https://bxn.connectrobot.app/r/token-two",
      reused: false,
    });
    const createSnapshot = vi
      .fn()
      .mockResolvedValueOnce(firstSnapshot)
      .mockResolvedValueOnce(changedSnapshot);
    const writeClipboard = vi.fn(async () => undefined);

    await copyReferralPlanLink({
      sessionId: "session-one",
      createSnapshot,
      writeClipboard,
      onSnapshotCreated: vi.fn(),
    });
    await copyReferralPlanLink({
      sessionId: "session-one",
      createSnapshot,
      writeClipboard,
      onSnapshotCreated: vi.fn(),
    });

    expect(writeClipboard).toHaveBeenNthCalledWith(
      1,
      "https://bxn.connectrobot.app/r/token-one",
    );
    expect(writeClipboard).toHaveBeenNthCalledWith(
      2,
      "https://bxn.connectrobot.app/r/token-two",
    );
  });

  it("does not expose raw snapshot/API errors when link creation fails", async () => {
    const writeClipboard = vi.fn(async () => undefined);
    const onSnapshotCreated = vi.fn();

    await expect(
      copyReferralPlanLink({
        sessionId: "session-one",
        createSnapshot: vi.fn(async () => {
          throw new Error("Supabase service role failed");
        }),
        writeClipboard,
        onSnapshotCreated,
      }),
    ).rejects.toThrow("Supabase service role failed");

    expect(writeClipboard).not.toHaveBeenCalled();
    expect(onSnapshotCreated).not.toHaveBeenCalled();
    expect(REFERRAL_PLAN_LINK_FAILURE_LABEL).toBe("Couldn't copy link");
  });

  it("does not mark the snapshot as available when clipboard copy fails", async () => {
    const snapshot = referralPlanSnapshot({
      snapshot_url: "https://bxn.connectrobot.app/r/token-one",
      reused: true,
    });
    const onSnapshotCreated = vi.fn();

    await expect(
      copyReferralPlanLink({
        sessionId: "session-one",
        createSnapshot: vi.fn(async () => snapshot),
        writeClipboard: vi.fn(async () => {
          throw new Error("Clipboard permission denied");
        }),
        onSnapshotCreated,
      }),
    ).rejects.toThrow("Clipboard permission denied");

    expect(onSnapshotCreated).not.toHaveBeenCalled();
    expect(REFERRAL_PLAN_LINK_FAILURE_LABEL).toBe("Couldn't copy link");
  });
});

function referralPlanSnapshot(
  input: Pick<ReferralPlanSnapshotResponse, "snapshot_url" | "reused">,
): ReferralPlanSnapshotResponse {
  return {
    token: input.snapshot_url.split("/").pop() ?? "token",
    snapshot_url: input.snapshot_url,
    pdf_url: `${input.snapshot_url}/pdf`,
    created_at: "2026-08-31T12:00:00.000Z",
    reused: input.reused,
    snapshot: {
      session_id: "00000000-0000-4000-8000-000000000111",
      scenario_summary: "A useful BXN referral plan.",
      headline: "BXN referrals to consider",
      created_at: "2026-08-31T12:00:00.000Z",
      recommendation_board: {
        session_summary: "A useful BXN referral plan.",
        headline: "BXN referrals to consider",
        total_recommendations: 1,
        open_questions: [],
        category_groups: [],
      },
    },
  };
}
