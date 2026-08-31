import { existsSync, readFileSync } from "node:fs";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

import { extractReferralPlanToken } from "../../api/connectrobot/referral-plan.js";
import {
  deriveBxnProfileUrlFromName,
  resolveBxnProfileUrl,
} from "../../server/connectrobot/member-profile.js";
import { normalizeUsPhone } from "../../server/connectrobot/contact.js";
import {
  MEMBER_REFERRAL_SMS,
  USER_REFERRAL_PLAN_SMS,
  buildMemberReferralSmsText,
  buildRecipientKey,
  selectEligibleMemberSmsRecipients,
  sendEligibleMemberReferralSmsNotifications,
  sendUserReferralPlanSmsOnce,
  type MemberReferralSmsRecipient,
  type ReferralNotificationRepository,
  type ReferralNotificationReservation,
  type ReserveReferralNotificationInput,
} from "../../server/connectrobot/referral-notifications.js";
import { renderReferralPlanPdf } from "../../server/connectrobot/referral-plan-pdf.js";
import {
  SupabaseReferralPlanRepository,
  createPublicToken,
  fingerprintSnapshot,
  isStalePendingNotification,
} from "../../server/connectrobot/referral-plan-repository.js";
import type { ReferralPlanSnapshotPayload } from "../../server/connectrobot/referral-plan-schemas.js";
import {
  TelnyxSmsDeliveryService,
  buildReferralPlanSmsText,
} from "../../server/connectrobot/sms.js";
import {
  CandidateScorerResultsSchema,
  ScenarioContextSchema,
} from "../../server/networking-dna/schemas.js";
import { SupabaseSessionRepository } from "../../server/networking-dna/session-repository.js";
import fixture from "./fixtures/austin-family-business.json";

const SESSION_ID = "00000000-0000-4000-8000-000000000111";
const CONTACT_ID = "00000000-0000-4000-8000-000000000222";
const SNAPSHOT_ID = "00000000-0000-4000-8000-000000000333";
const SNAPSHOT_ID_2 = "00000000-0000-4000-8000-000000000334";
const MEMBER_ID = "00000000-0000-4000-8000-000000000001";
const MEMBER_ID_2 = "00000000-0000-4000-8000-000000000002";
const MEMBER_ID_3 = "00000000-0000-4000-8000-000000000003";

describe("ConnectROBOT handoff helpers", () => {
  it("derives conservative BXN profile URLs from member names", () => {
    expect(deriveBxnProfileUrlFromName(" Miguel Escobedo ")).toBe(
      "https://bxnmembers.com/user/miguel.escobedo/",
    );
    expect(deriveBxnProfileUrlFromName("Prince")).toBeNull();
    expect(resolveBxnProfileUrl("Miguel Escobedo", "https://example.com/profile")).toBe(
      "https://example.com/profile",
    );
    expect(
      resolveBxnProfileUrl(
        "George Tagg Jr",
        "https://bxnmembers.com/user/george.tagg+jr/",
      ),
    ).toBe("https://bxnmembers.com/user/george.tagg+jr/");
    expect(
      resolveBxnProfileUrl(
        "Isael and Petra Lugo",
        "https://bxnmembers.com/user/petra.lugo/",
      ),
    ).toBe("https://bxnmembers.com/user/petra.lugo/");
  });

  it("normalizes mobile numbers for SMS delivery", () => {
    expect(normalizeUsPhone("(512) 555-0142")).toBe("+15125550142");
    expect(normalizeUsPhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(() => normalizeUsPhone("123")).toThrow("valid mobile number");
  });

  it("treats only old pending notification reservations as stale", () => {
    const now = new Date("2026-08-30T16:00:00.000Z");

    expect(
      isStalePendingNotification("2026-08-30T15:57:59.000Z", now),
    ).toBe(true);
    expect(
      isStalePendingNotification("2026-08-30T15:58:30.000Z", now),
    ).toBe(false);
  });

  it("creates secure-looking public tokens and stable snapshot fingerprints", () => {
    const snapshot = buildSnapshotPayload();
    const token = createPublicToken();

    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(fingerprintSnapshot(snapshot)).toBe(fingerprintSnapshot(buildSnapshotPayload()));
    expect(
      fingerprintSnapshot({
        ...snapshot,
        recommendation_board: {
          ...snapshot.recommendation_board,
          headline: "Changed",
        },
      }),
    ).not.toBe(fingerprintSnapshot(snapshot));
  });

  it("extracts referral-plan tokens from rewritten and direct API URLs", () => {
    expect(
      extractReferralPlanToken(
        "https://example.com/api/connectrobot/referral-plan/token-123",
      ),
    ).toBe("token-123");
    expect(
      extractReferralPlanToken(
        "https://example.com/api/connectrobot/referral-plan?token=token-123",
      ),
    ).toBe("token-123");
  });

  it("renders a real PDF from the frozen referral-plan snapshot", async () => {
    const pdf = await renderReferralPlanPdf(buildSnapshotPayload());
    const header = new TextDecoder().decode(pdf.slice(0, 8));
    const loaded = await PDFDocument.load(pdf);
    const annotations = loaded.getPages()[0]?.node.Annots();
    const link = annotations?.lookup(0, PDFDict);
    const action = link?.lookup(PDFName.of("A"), PDFDict);
    const uri = action?.lookup(PDFName.of("URI"), PDFString).decodeText();

    expect(header).toContain("%PDF");
    expect(uri).toBe("https://bxnmembers.com/user/nancy.dominguez/");
  });

  it("sanitizes referral-plan PDF presentation strings", () => {
    const source = readFileSync("server/connectrobot/referral-plan-pdf.ts", "utf8");

    expect(source).toContain("sanitizeBoardHeadline");
    expect(source).toContain("sanitizeRecommendationReason");
    expect(source).toContain("No strong BXN matches yet");
    expect(source).not.toContain("No grounded BXN referral candidates yet");
    expect(source).not.toContain("Grounded BXN referral candidate.");
  });

  it("sends Telnyx SMS without exposing provider credentials in the response", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const service = new TelnyxSmsDeliveryService(
      "telnyx-secret",
      "+15125550100",
      fetchImpl,
    );

    await service.send({
      to: "+15125550142",
      text: buildReferralPlanSmsText({
        name: "Miguel",
        snapshotUrl: "https://connectrobot.example/r/token",
      }),
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.telnyx.com/v2/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer telnyx-secret",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          from: "+15125550100",
          to: "+15125550142",
          text: "Hi Miguel - here are the BXN recommendations you created with ConnectROBOT: https://connectrobot.example/r/token",
        }),
      }),
    );
  });

  it("builds concise member referral SMS copy without reusing the user SMS", () => {
    const snapshot = buildSnapshotPayload();
    const recipient: MemberReferralSmsRecipient = {
      memberId: MEMBER_ID,
      fullName: "Miguel Escobedo",
      businessName: "cuteROBOT",
      phone: "+15125550100",
      recommendationReason: "Missed calls and lead follow-up are creating lost opportunities.",
      needLabel: "AI Automation",
    };

    expect(
      buildMemberReferralSmsText({
        recipient,
        snapshot,
        snapshotUrl: "https://connectrobot.example/r/token",
        userName: "Avery",
        userPhone: "+15125550142",
      }),
    ).toBe(
      [
        "New BXN referral for cuteROBOT",
        "Avery is looking for help with Missed calls and lead follow-up are creating lost opportunities.",
        "Contact: +15125550142",
        "Referral plan: https://connectrobot.example/r/token",
      ].join("\n\n"),
    );
  });
});

describe("ConnectROBOT referral SMS safety rails", () => {
  it("records the live sms_referral_optin safety rail with default false and NOT NULL", () => {
    const migration = readFileSync(
      "supabase/migrations/20260830141235_add_member_sms_referral_optin.sql",
      "utf8",
    );

    expect(
      existsSync(
        "supabase/migrations/20260830092311_add_referral_sms_notifications.sql",
      ),
    ).toBe(false);
    expect(migration).toMatch(
      /add column if not exists sms_referral_optin boolean not null default false/i,
    );
    expect(migration).toMatch(/alter column sms_referral_optin set default false/i);
    expect(migration).toMatch(/alter column sms_referral_optin set not null/i);
    expect(migration).not.toMatch(/sms_referral_optin\s*=\s*true/i);
  });

  it("uses a durable recipient and snapshot notification uniqueness key", () => {
    const migration = readFileSync(
      "supabase/migrations/20260830163631_add_referral_sms_notifications.sql",
      "utf8",
    );

    expect(migration).toContain("networking_referral_notifications");
    expect(migration).toContain("recipient_key text not null");
    expect(migration).toMatch(/unique \(snapshot_id, notification_type, recipient_key\)/i);
    expect(migration).toMatch(/recipient_type in \('user', 'member'\)/i);
    expect(migration).toMatch(/status in \('pending', 'sent', 'failed'\)/i);
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("grant select, insert, update");
  });

  it("selects only opted-in recommended members with valid canonical member phones", () => {
    const snapshot = buildSnapshotPayload({
      recommendations: [
        recommendation({ member_id: MEMBER_ID, display_tier: "recommended", phone: "+19999999999" }),
        recommendation({
          member_id: MEMBER_ID_2,
          display_tier: "also_consider",
          full_name: "Also Consider",
        }),
        recommendation({
          member_id: MEMBER_ID_3,
          display_tier: "recommended",
          full_name: "No Opt In",
        }),
        recommendation({
          member_id: "00000000-0000-4000-8000-000000000004",
          display_tier: "recommended",
          full_name: "Bad Phone",
        }),
      ],
    });

    const recipients = selectEligibleMemberSmsRecipients({
      snapshot,
      members: [
        {
          id: MEMBER_ID,
          full_name: "Miguel Escobedo",
          business_name: "cuteROBOT",
          phone: "(512) 555-0100",
          sms_referral_optin: true,
        },
        {
          id: MEMBER_ID_2,
          full_name: "Also Consider",
          business_name: "Secondary Co",
          phone: "(512) 555-0101",
          sms_referral_optin: true,
        },
        {
          id: MEMBER_ID_3,
          full_name: "No Opt In",
          business_name: "Quiet Co",
          phone: "(512) 555-0102",
          sms_referral_optin: false,
        },
        {
          id: "00000000-0000-4000-8000-000000000004",
          full_name: "Bad Phone",
          business_name: "Bad Phone Co",
          phone: "123",
          sms_referral_optin: true,
        },
        {
          id: "00000000-0000-4000-8000-000000000005",
          full_name: "Absent From Snapshot",
          business_name: "Absent Co",
          phone: "(512) 555-0105",
          sms_referral_optin: true,
        },
      ],
      normalizePhone: normalizeUsPhone,
    });

    expect(recipients).toEqual([
      expect.objectContaining({
        memberId: MEMBER_ID,
        phone: "+15125550100",
        recommendationReason: "Relevant contractor profile for a home project.",
      }),
    ]);
  });

  it("dedupes member SMS for the same member and snapshot but allows a new snapshot", async () => {
    const repository = new FakeNotificationRepository([
      {
        memberId: MEMBER_ID,
        fullName: "Miguel Escobedo",
        businessName: "cuteROBOT",
        phone: "+15125550100",
        recommendationReason: "Missed calls and lead follow-up.",
        needLabel: "AI Automation",
      },
    ]);
    const smsDelivery = { send: vi.fn(async () => undefined) };
    const snapshot = buildSnapshotRow(SNAPSHOT_ID);

    await sendEligibleMemberReferralSmsNotifications({
      repository,
      smsDelivery,
      snapshot,
      snapshotUrl: "https://connectrobot.example/r/one",
      userName: "Avery",
      userPhone: "+15125550142",
    });
    await sendEligibleMemberReferralSmsNotifications({
      repository,
      smsDelivery,
      snapshot,
      snapshotUrl: "https://connectrobot.example/r/one",
      userName: "Avery",
      userPhone: "+15125550142",
    });
    await sendEligibleMemberReferralSmsNotifications({
      repository,
      smsDelivery,
      snapshot: buildSnapshotRow(SNAPSHOT_ID_2),
      snapshotUrl: "https://connectrobot.example/r/two",
      userName: "Avery",
      userPhone: "+15125550142",
    });

    expect(smsDelivery.send).toHaveBeenCalledTimes(2);
    expect(smsDelivery.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ to: "+15125550100" }),
    );
  });

  it("dedupes user SMS for the same contact and frozen snapshot", async () => {
    const repository = new FakeNotificationRepository([]);
    const smsDelivery = { send: vi.fn(async () => undefined) };
    const snapshot = buildSnapshotRow(SNAPSHOT_ID);

    await expect(
      sendUserReferralPlanSmsOnce({
        repository,
        smsDelivery,
        snapshot,
        contactId: CONTACT_ID,
        destinationPhone: "+15125550142",
        text: "User referral plan link",
      }),
    ).resolves.toBe("sent");
    await expect(
      sendUserReferralPlanSmsOnce({
        repository,
        smsDelivery,
        snapshot,
        contactId: CONTACT_ID,
        destinationPhone: "+15125550142",
        text: "User referral plan link",
      }),
    ).resolves.toBe("already_sent");

    expect(smsDelivery.send).toHaveBeenCalledTimes(1);
    expect(repository.sentNotifications()).toEqual([
      expect.objectContaining({
        type: USER_REFERRAL_PLAN_SMS,
        key: buildRecipientKey({ recipient_type: "user", contact_id: CONTACT_ID }),
      }),
    ]);
  });

  it("does not report member SMS failure as user SMS failure", async () => {
    const repository = new FakeNotificationRepository([
      {
        memberId: MEMBER_ID,
        fullName: "Miguel Escobedo",
        businessName: "cuteROBOT",
        phone: "+15125550100",
        recommendationReason: "Missed calls and lead follow-up.",
        needLabel: "AI Automation",
      },
    ]);
    const userSmsDelivery = { send: vi.fn(async () => undefined) };
    const memberSmsDelivery = {
      send: vi.fn(async () => {
        throw new Error("Provider rejected member SMS");
      }),
    };
    const snapshot = buildSnapshotRow(SNAPSHOT_ID);

    await expect(
      sendUserReferralPlanSmsOnce({
        repository,
        smsDelivery: userSmsDelivery,
        snapshot,
        contactId: CONTACT_ID,
        destinationPhone: "+15125550142",
        text: "User referral plan link",
      }),
    ).resolves.toBe("sent");

    const result = await sendEligibleMemberReferralSmsNotifications({
      repository,
      smsDelivery: memberSmsDelivery,
      snapshot,
      snapshotUrl: "https://connectrobot.example/r/token",
      userName: "Avery",
      userPhone: "+15125550142",
    });

    expect(result).toEqual({ sent: 0, skipped: 0, failed: 1 });
    expect(userSmsDelivery.send).toHaveBeenCalledTimes(1);
  });

  it("keeps member notifications exclusive to the Text Recommendations endpoint", () => {
    const apiFiles = [
      "api/connectrobot/referral-plan-text.ts",
      "api/connectrobot/referral-plan.ts",
      "api/connectrobot/referral-plan-pdf.ts",
      "api/connectrobot/session.ts",
      "api/connectrobot/session-message.ts",
    ];
    const filesWithMemberNotifications = apiFiles.filter((file) =>
      readFileSync(file, "utf8").includes("sendEligibleMemberReferralSmsNotifications"),
    );

    expect(filesWithMemberNotifications).toEqual(["api/connectrobot/referral-plan-text.ts"]);
  });
});

describe("ConnectROBOT Supabase handoff repository", () => {
  it("creates an immutable snapshot from the current server-side session board", async () => {
    const snapshotPayload = buildSnapshotPayload();
    const insert = vi.fn((payload: Record<string, unknown>) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: SNAPSHOT_ID,
            session_id: SESSION_ID,
            public_token: payload.public_token,
            board_fingerprint: payload.board_fingerprint,
            snapshot: payload.snapshot,
            created_at: snapshotPayload.created_at,
            created_by_contact_id: null,
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "networking_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: SESSION_ID,
                    current_summary: snapshotPayload.scenario_summary,
                    current_recommendations: snapshotPayload.recommendation_board,
                  },
                  error: null,
                })),
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                  })),
                })),
              })),
            })),
          })),
          insert,
        };
      }),
    } as unknown as SupabaseClient;

    const repository = new SupabaseReferralPlanRepository(supabase);
    const result = await repository.createOrReuseSnapshot(SESSION_ID);

    expect(result.reused).toBe(false);
    expect(result.row.snapshot.recommendation_board.headline).toBe(
      snapshotPayload.recommendation_board.headline,
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: SESSION_ID,
        snapshot: expect.objectContaining({
          session_id: SESSION_ID,
          recommendation_board: snapshotPayload.recommendation_board,
        }),
      }),
    );
  });

  it("does not resend for a fresh pending notification reservation", async () => {
    const update = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: null,
              error: { code: "23505", message: "duplicate key value" },
            })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: "00000000-0000-4000-8000-000000000444",
                    status: "pending",
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                })),
              })),
            })),
          })),
        })),
        update,
      })),
    } as unknown as SupabaseClient;

    const repository = new SupabaseReferralPlanRepository(supabase);
    const result = await repository.reserveNotification({
      snapshot_id: SNAPSHOT_ID,
      recipient_type: "user",
      contact_id: CONTACT_ID,
      destination_phone: "+15125550142",
      notification_type: USER_REFERRAL_PLAN_SMS,
    });

    expect(result).toEqual({
      id: "00000000-0000-4000-8000-000000000444",
      shouldSend: false,
      status: "pending",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("resets a stale pending notification reservation so delivery can retry", async () => {
    const retrySelect = vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({
        data: { id: "00000000-0000-4000-8000-000000000444" },
        error: null,
      })),
    }));
    const staleCutoff = vi.fn(() => ({ select: retrySelect }));
    const pendingStatus = vi.fn(() => ({ lt: staleCutoff }));
    const notificationId = vi.fn(() => ({ eq: pendingStatus }));
    const update = vi.fn(() => ({ eq: notificationId }));
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: null,
              error: { code: "23505", message: "duplicate key value" },
            })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: "00000000-0000-4000-8000-000000000444",
                    status: "pending",
                    updated_at: "2026-08-30T15:57:00.000Z",
                  },
                  error: null,
                })),
              })),
            })),
          })),
        })),
        update,
      })),
    } as unknown as SupabaseClient;

    const repository = new SupabaseReferralPlanRepository(supabase);
    const result = await repository.reserveNotification({
      snapshot_id: SNAPSHOT_ID,
      recipient_type: "user",
      contact_id: CONTACT_ID,
      destination_phone: "+15125550142",
      notification_type: USER_REFERRAL_PLAN_SMS,
    });

    expect(result).toEqual({
      id: "00000000-0000-4000-8000-000000000444",
      shouldSend: true,
      status: "pending",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        destination_phone: "+15125550142",
        error_message: null,
      }),
    );
    expect(notificationId).toHaveBeenCalledWith(
      "id",
      "00000000-0000-4000-8000-000000000444",
    );
    expect(pendingStatus).toHaveBeenCalledWith("status", "pending");
    expect(staleCutoff).toHaveBeenCalledWith("updated_at", expect.any(String));
  });

  it("updates an existing session contact for the same normalized phone", async () => {
    const update = vi.fn((payload: Record<string, unknown>) => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: CONTACT_ID }, error: null })),
        })),
      })),
    }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: CONTACT_ID },
                error: null,
              })),
            })),
          })),
        })),
        update,
      })),
    } as unknown as SupabaseClient;

    const repository = new SupabaseReferralPlanRepository(supabase);
    await expect(
      repository.upsertSessionContact({
        session_id: SESSION_ID,
        name: "Miguel",
        phone: "(512) 555-0142",
      }),
    ).resolves.toBe(CONTACT_ID);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Miguel",
        phone: "+15125550142",
      }),
    );
  });

  it("reuses an existing email contact when adding a new phone number", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: CONTACT_ID }, error: null });
    const update = vi.fn((payload: Record<string, unknown>) => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: CONTACT_ID }, error: null })),
        })),
      })),
    }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle })),
          })),
        })),
        update,
      })),
    } as unknown as SupabaseClient;

    const repository = new SupabaseReferralPlanRepository(supabase);
    await expect(
      repository.upsertSessionContact({
        session_id: SESSION_ID,
        name: "Miguel",
        email: " MIGUEL@EXAMPLE.COM ",
        phone: "(512) 555-0142",
      }),
    ).resolves.toBe(CONTACT_ID);

    expect(maybeSingle).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "miguel@example.com",
        phone: "+15125550142",
      }),
    );
  });
});

describe("Networking DNA member metadata enrichment", () => {
  it("attaches phone, email, and profile URL after scorer results return", async () => {
    const candidates = CandidateScorerResultsSchema.parse(fixture.scorer_results).slice(0, 1);
    const supabase = {
      rpc: vi.fn(async () => ({ data: candidates, error: null })),
      from: vi.fn((table: string) => {
        expect(table).toBe("bxn_members");
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: [
                {
                  id: candidates[0]?.member_id,
                  phone: "512-555-0142",
                  email: "nancy@example.com",
                  profile_url: "https://bxnmembers.com/user/nancy.dominguez/",
                },
              ],
              error: null,
            })),
          })),
        };
      }),
    } as unknown as SupabaseClient;

    const repository = new SupabaseSessionRepository(supabase);
    const enriched = await repository.previewCandidates(
      ScenarioContextSchema.parse(fixture.structured_context),
      3,
    );

    expect(enriched[0]).toEqual(
      expect.objectContaining({
        phone: "512-555-0142",
        email: "nancy@example.com",
        profile_url: "https://bxnmembers.com/user/nancy.dominguez/",
      }),
    );
  });
});

function buildSnapshotRow(snapshotId: string) {
  const payload = buildSnapshotPayload();
  return {
    id: snapshotId,
    session_id: SESSION_ID,
    public_token: `token-${snapshotId.slice(-3)}`,
    board_fingerprint: `fingerprint-${snapshotId.slice(-3)}`,
    snapshot: payload,
    created_at: payload.created_at,
    created_by_contact_id: CONTACT_ID,
  };
}

class FakeNotificationRepository implements ReferralNotificationRepository {
  private readonly notifications = new Map<
    string,
    ReferralNotificationReservation & { key: string; type: string }
  >();

  constructor(private readonly memberRecipients: MemberReferralSmsRecipient[]) {}

  async reserveNotification(
    input: ReserveReferralNotificationInput,
  ): Promise<ReferralNotificationReservation> {
    const key = buildRecipientKey(input);
    const compoundKey = `${input.snapshot_id}:${input.notification_type}:${key}`;
    const existing = this.notifications.get(compoundKey);

    if (existing?.status === "sent" || existing?.status === "pending") {
      return { id: existing.id, shouldSend: false, status: existing.status };
    }

    const notification = {
      id: `notification-${this.notifications.size + 1}`,
      shouldSend: true,
      status: "pending" as const,
      key,
      type: input.notification_type,
    };
    this.notifications.set(compoundKey, notification);
    return notification;
  }

  async markNotificationSent(notificationId: string): Promise<void> {
    const notification = this.findById(notificationId);
    notification.status = "sent";
    notification.shouldSend = false;
  }

  async markNotificationFailed(notificationId: string): Promise<void> {
    const notification = this.findById(notificationId);
    notification.status = "failed";
    notification.shouldSend = false;
  }

  async listEligibleMemberSmsRecipients(): Promise<MemberReferralSmsRecipient[]> {
    return this.memberRecipients;
  }

  sentNotifications(): Array<{ key: string; type: string }> {
    return [...this.notifications.values()]
      .filter((notification) => notification.status === "sent")
      .map((notification) => ({ key: notification.key, type: notification.type }));
  }

  private findById(notificationId: string) {
    const notification = [...this.notifications.values()].find(
      (item) => item.id === notificationId,
    );
    if (!notification) throw new Error("Notification not found");
    return notification;
  }
}

function buildSnapshotPayload(input: {
  recommendations?: ReferralPlanSnapshotPayload["recommendation_board"]["category_groups"][number]["recommendations"];
} = {}): ReferralPlanSnapshotPayload {
  const recommendations = input.recommendations ?? [recommendation()];
  return {
    session_id: SESSION_ID,
    scenario_summary: "A family bought a home that needs work.",
    headline: "BXN referral candidates for this scenario",
    recommendation_board: {
      session_summary: "A family bought a home that needs work.",
      headline: "BXN referral candidates for this scenario",
      total_recommendations: recommendations.length,
      category_groups: [
        {
          category_key: "home_property",
          category_label: "Home & Property",
          category_summary: "Home referrals.",
          recommendations,
        },
      ],
      open_questions: [],
    },
    created_at: "2026-08-28T00:00:00.000Z",
  };
}

function recommendation(
  overrides: Partial<
    ReferralPlanSnapshotPayload["recommendation_board"]["category_groups"][number]["recommendations"][number]
  > = {},
): ReferralPlanSnapshotPayload["recommendation_board"]["category_groups"][number]["recommendations"][number] {
  return {
    member_id: MEMBER_ID,
    full_name: "Nancy Dominguez",
    business_name: "Seven-S Contractor Services",
    phone: "512-555-0142",
    email: "nancy@example.com",
    profile_url: "https://bxnmembers.com/user/nancy.dominguez/",
    need_key: "general_contractor",
    need_label: "General Contractor",
    match_type: "exact",
    display_tier: "recommended",
    reason: "Relevant contractor profile for a home project.",
    evidence: ["General contractor services"],
    service_area_note: "Serves the Austin area.",
    network_note: null,
    score: 96,
    ...overrides,
  };
}
