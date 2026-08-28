import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

import { extractReferralPlanToken } from "../../api/connectrobot/referral-plan.js";
import {
  deriveBxnProfileUrlFromName,
  resolveBxnProfileUrl,
} from "../../server/connectrobot/member-profile.js";
import { normalizeUsPhone } from "../../server/connectrobot/contact.js";
import { renderReferralPlanPdf } from "../../server/connectrobot/referral-plan-pdf.js";
import {
  SupabaseReferralPlanRepository,
  createPublicToken,
  fingerprintSnapshot,
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

describe("ConnectROBOT handoff helpers", () => {
  it("derives conservative BXN profile URLs from member names", () => {
    expect(deriveBxnProfileUrlFromName(" Miguel Escobedo ")).toBe(
      "https://bxnmembers.com/user/miguel.escobedo/",
    );
    expect(deriveBxnProfileUrlFromName("Prince")).toBeNull();
    expect(resolveBxnProfileUrl("Miguel Escobedo", "https://example.com/profile")).toBe(
      "https://example.com/profile",
    );
  });

  it("normalizes mobile numbers for SMS delivery", () => {
    expect(normalizeUsPhone("(512) 555-0142")).toBe("+15125550142");
    expect(normalizeUsPhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(() => normalizeUsPhone("123")).toThrow("valid mobile number");
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

function buildSnapshotPayload(): ReferralPlanSnapshotPayload {
  return {
    session_id: SESSION_ID,
    scenario_summary: "A family bought a home that needs work.",
    headline: "BXN referral candidates for this scenario",
    recommendation_board: {
      session_summary: "A family bought a home that needs work.",
      headline: "BXN referral candidates for this scenario",
      total_recommendations: 1,
      category_groups: [
        {
          category_key: "home_property",
          category_label: "Home & Property",
          category_summary: "Home referrals.",
          recommendations: [
            {
              member_id: "00000000-0000-4000-8000-000000000001",
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
            },
          ],
        },
      ],
      open_questions: [],
    },
    created_at: "2026-08-28T00:00:00.000Z",
  };
}
