import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SessionContactInputSchema,
  normalizeEmail,
  normalizeUsPhone,
  type SessionContactInput,
} from "./contact.js";
import {
  ReferralPlanSnapshotPayloadSchema,
  ReferralPlanSnapshotRowSchema,
  type ReferralPlanSnapshotPayload,
  type ReferralPlanSnapshotResponse,
  type ReferralPlanSnapshotRow,
} from "./referral-plan-schemas.js";
import { RecommendationBoardSchema } from "../networking-dna/schemas.js";

export interface SnapshotResult {
  row: ReferralPlanSnapshotRow;
  reused: boolean;
}

export class SupabaseReferralPlanRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createOrReuseSnapshot(
    sessionId: string,
    createdByContactId?: string | null,
  ): Promise<SnapshotResult> {
    const snapshot = await this.buildSnapshotPayload(sessionId);
    const boardFingerprint = fingerprintSnapshot(snapshot);

    const { data: existing, error: existingError } = await this.supabase
      .from("networking_export_snapshots")
      .select("id,session_id,public_token,board_fingerprint,snapshot,created_at,created_by_contact_id")
      .eq("session_id", sessionId)
      .eq("board_fingerprint", boardFingerprint)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    assertNoSupabaseError(existingError, "Fetch existing referral plan snapshot");

    if (existing) {
      return {
        row: ReferralPlanSnapshotRowSchema.parse(existing),
        reused: true,
      };
    }

    const publicToken = createPublicToken();
    const { data: inserted, error: insertError } = await this.supabase
      .from("networking_export_snapshots")
      .insert({
        session_id: sessionId,
        public_token: publicToken,
        board_fingerprint: boardFingerprint,
        snapshot,
        created_by_contact_id: createdByContactId ?? null,
      })
      .select("id,session_id,public_token,board_fingerprint,snapshot,created_at,created_by_contact_id")
      .single();

    assertNoSupabaseError(insertError, "Create referral plan snapshot");

    return {
      row: ReferralPlanSnapshotRowSchema.parse(inserted),
      reused: false,
    };
  }

  async findSnapshotByToken(publicToken: string): Promise<ReferralPlanSnapshotRow | null> {
    const { data, error } = await this.supabase
      .from("networking_export_snapshots")
      .select("id,session_id,public_token,board_fingerprint,snapshot,created_at,created_by_contact_id")
      .eq("public_token", publicToken)
      .maybeSingle();

    assertNoSupabaseError(error, "Fetch referral plan snapshot");
    return data ? ReferralPlanSnapshotRowSchema.parse(data) : null;
  }

  async upsertSessionContact(input: SessionContactInput): Promise<string> {
    const parsed = SessionContactInputSchema.parse(input);
    const normalizedEmail = normalizeEmail(parsed.email);
    const normalizedPhone = parsed.phone ? normalizeUsPhone(parsed.phone) : null;

    if (!normalizedEmail && !normalizedPhone) {
      throw new Error("Email or mobile number is required.");
    }

    const existingByPhone = normalizedPhone
      ? await this.findContactByPhone(parsed.session_id, normalizedPhone)
      : null;
    const existing =
      existingByPhone ??
      (normalizedEmail ? await this.findContactByEmail(parsed.session_id, normalizedEmail) : null);

    const payload = {
      session_id: parsed.session_id,
      name: parsed.name,
      email: normalizedEmail,
      phone: normalizedPhone,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await this.supabase
        .from("networking_session_contacts")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single();

      assertNoSupabaseError(error, "Update networking session contact");
      return ContactIdRowSchema.parse(data).id;
    }

    const { data, error } = await this.supabase
      .from("networking_session_contacts")
      .insert(payload)
      .select("id")
      .single();

    assertNoSupabaseError(error, "Create networking session contact");
    return ContactIdRowSchema.parse(data).id;
  }

  private async buildSnapshotPayload(sessionId: string): Promise<ReferralPlanSnapshotPayload> {
    const { data, error } = await this.supabase
      .from("networking_sessions")
      .select("id,current_summary,current_recommendations")
      .eq("id", sessionId)
      .single();

    assertNoSupabaseError(error, "Fetch networking session for referral plan");

    const session = SessionSnapshotSourceSchema.parse(data);
    const board = RecommendationBoardSchema.parse(session.current_recommendations);

    if (board.total_recommendations === 0) {
      throw new Error("Create recommendations before saving a referral plan.");
    }

    return ReferralPlanSnapshotPayloadSchema.parse({
      session_id: session.id,
      scenario_summary: board.session_summary || session.current_summary || "",
      headline: board.headline,
      recommendation_board: board,
      created_at: new Date().toISOString(),
    });
  }

  private async findContactByPhone(sessionId: string, phone: string) {
    const { data, error } = await this.supabase
      .from("networking_session_contacts")
      .select("id")
      .eq("session_id", sessionId)
      .eq("phone", phone)
      .maybeSingle();

    assertNoSupabaseError(error, "Find networking session contact by phone");
    return data ? ContactIdRowSchema.parse(data) : null;
  }

  private async findContactByEmail(sessionId: string, email: string) {
    const { data, error } = await this.supabase
      .from("networking_session_contacts")
      .select("id")
      .eq("session_id", sessionId)
      .eq("email", email)
      .maybeSingle();

    assertNoSupabaseError(error, "Find networking session contact by email");
    return data ? ContactIdRowSchema.parse(data) : null;
  }
}

export function createSnapshotResponse(
  result: SnapshotResult,
  origin: string,
): ReferralPlanSnapshotResponse {
  const snapshotUrl = new URL(`/r/${result.row.public_token}`, origin).toString();
  const pdfUrl = new URL(
    `/api/connectrobot/referral-plan/${result.row.public_token}/pdf`,
    origin,
  ).toString();

  return {
    token: result.row.public_token,
    snapshot_url: snapshotUrl,
    pdf_url: pdfUrl,
    snapshot: result.row.snapshot,
    created_at: result.row.created_at,
    reused: result.reused,
  };
}

export function fingerprintSnapshot(snapshot: ReferralPlanSnapshotPayload): string {
  return createHash("sha256").update(stableJson(snapshot.recommendation_board)).digest("hex");
}

export function createPublicToken(): string {
  return randomBytes(24).toString("base64url");
}

function assertNoSupabaseError(error: { message: string } | null, operation: string): void {
  if (error) {
    throw new Error(`${operation} failed: ${error.message}`);
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

const ContactIdRowSchema = {
  parse(value: unknown): { id: string } {
    if (!value || typeof value !== "object" || typeof (value as { id?: unknown }).id !== "string") {
      throw new Error("Invalid networking session contact response");
    }
    return { id: (value as { id: string }).id };
  },
};

const SessionSnapshotSourceSchema = {
  parse(value: unknown): {
    id: string;
    current_summary: string | null;
    current_recommendations: unknown;
  } {
    if (!value || typeof value !== "object") {
      throw new Error("Invalid networking session response");
    }

    const row = value as {
      id?: unknown;
      current_summary?: unknown;
      current_recommendations?: unknown;
    };

    if (typeof row.id !== "string") {
      throw new Error("Invalid networking session id");
    }

    return {
      id: row.id,
      current_summary:
        typeof row.current_summary === "string" ? row.current_summary : null,
      current_recommendations: row.current_recommendations,
    };
  },
};
