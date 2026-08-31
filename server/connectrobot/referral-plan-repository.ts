import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SessionContactInputSchema,
  normalizeEmail,
  normalizeUsPhone,
  type SessionContactInput,
} from "./contact.js";
import {
  buildRecipientKey,
  selectEligibleMemberSmsRecipients,
  type MemberReferralSmsRecipient,
  type ReferralNotificationReservation,
  type ReserveReferralNotificationInput,
} from "./referral-notifications.js";
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

export const STALE_PENDING_NOTIFICATION_RETRY_AFTER_MS = 2 * 60 * 1000;

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

  async reserveNotification(
    input: ReserveReferralNotificationInput,
  ): Promise<ReferralNotificationReservation> {
    const recipientKey = buildRecipientKey(input);
    const payload = {
      snapshot_id: input.snapshot_id,
      recipient_type: input.recipient_type,
      member_id: input.recipient_type === "member" ? input.member_id : null,
      contact_id: input.recipient_type === "user" ? input.contact_id : null,
      recipient_key: recipientKey,
      destination_phone: input.destination_phone,
      notification_type: input.notification_type,
      status: "pending",
      error_message: null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("networking_referral_notifications")
      .insert(payload)
      .select("id,status,updated_at")
      .single();

    if (isUniqueViolation(error)) {
      const existing = await this.findNotificationByKey({
        snapshot_id: input.snapshot_id,
        notification_type: input.notification_type,
        recipient_key: recipientKey,
      });

      if (existing.status === "failed") {
        await this.resetNotificationForRetry(existing.id, input.destination_phone);
        return { id: existing.id, shouldSend: true, status: "pending" };
      }

      if (existing.status === "pending" && isStalePendingNotification(existing.updated_at)) {
        const reset = await this.resetStalePendingNotificationForRetry(
          existing.id,
          input.destination_phone,
          stalePendingNotificationCutoffIso(),
        );
        if (reset) return { id: existing.id, shouldSend: true, status: "pending" };
      }

      return { id: existing.id, shouldSend: false, status: existing.status };
    }

    assertNoSupabaseError(error, "Reserve referral notification");
    const row = NotificationReservationRowSchema.parse(data);
    return { id: row.id, shouldSend: true, status: row.status };
  }

  async markNotificationSent(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from("networking_referral_notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    assertNoSupabaseError(error, "Mark referral notification sent");
  }

  async markNotificationFailed(notificationId: string, error: unknown): Promise<void> {
    const { error: updateError } = await this.supabase
      .from("networking_referral_notifications")
      .update({
        status: "failed",
        error_message: getErrorMessage(error).slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    assertNoSupabaseError(updateError, "Mark referral notification failed");
  }

  async listEligibleMemberSmsRecipients(
    snapshot: ReferralPlanSnapshotRow,
  ): Promise<MemberReferralSmsRecipient[]> {
    const recommendedMemberIds = [
      ...new Set(
        snapshot.snapshot.recommendation_board.category_groups.flatMap((group) =>
          group.recommendations
            .filter((recommendation) => recommendation.display_tier === "recommended")
            .map((recommendation) => recommendation.member_id),
        ),
      ),
    ];

    if (recommendedMemberIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("bxn_members")
      .select("id,full_name,business_name,phone,sms_referral_optin")
      .in("id", recommendedMemberIds)
      .eq("sms_referral_optin", true);

    assertNoSupabaseError(error, "Fetch opted-in BXN member SMS recipients");

    return selectEligibleMemberSmsRecipients({
      snapshot: snapshot.snapshot,
      members: (data ?? []).map((row) => MemberSmsEligibilityRowSchema.parse(row)),
      normalizePhone: normalizeUsPhone,
    });
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

  private async findNotificationByKey(input: {
    snapshot_id: string;
    notification_type: string;
    recipient_key: string;
  }): Promise<{ id: string; status: "pending" | "sent" | "failed"; updated_at: string }> {
    const { data, error } = await this.supabase
      .from("networking_referral_notifications")
      .select("id,status,updated_at")
      .eq("snapshot_id", input.snapshot_id)
      .eq("notification_type", input.notification_type)
      .eq("recipient_key", input.recipient_key)
      .single();

    assertNoSupabaseError(error, "Fetch existing referral notification");
    return NotificationReservationRowSchema.parse(data);
  }

  private async resetStalePendingNotificationForRetry(
    notificationId: string,
    destinationPhone: string,
    staleBeforeIso: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("networking_referral_notifications")
      .update({
        status: "pending",
        destination_phone: destinationPhone,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("status", "pending")
      .lt("updated_at", staleBeforeIso)
      .select("id")
      .maybeSingle();

    assertNoSupabaseError(error, "Reset stale referral notification for retry");
    return Boolean(data);
  }

  private async resetNotificationForRetry(
    notificationId: string,
    destinationPhone: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("networking_referral_notifications")
      .update({
        status: "pending",
        destination_phone: destinationPhone,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    assertNoSupabaseError(error, "Reset referral notification for retry");
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

export function isStalePendingNotification(
  updatedAt: string,
  now = new Date(),
): boolean {
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) return false;
  return now.getTime() - updatedAtMs >= STALE_PENDING_NOTIFICATION_RETRY_AFTER_MS;
}

function stalePendingNotificationCutoffIso(): string {
  return new Date(Date.now() - STALE_PENDING_NOTIFICATION_RETRY_AFTER_MS).toISOString();
}

function assertNoSupabaseError(error: { message: string } | null, operation: string): void {
  if (error) {
    throw new Error(`${operation} failed: ${error.message}`);
  }
}

function isUniqueViolation(error: { code?: string; message: string } | null): boolean {
  return error?.code === "23505" || /duplicate key|unique/i.test(error?.message ?? "");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

const NotificationReservationRowSchema = {
  parse(value: unknown): { id: string; status: "pending" | "sent" | "failed"; updated_at: string } {
    if (!value || typeof value !== "object") {
      throw new Error("Invalid referral notification response");
    }

    const row = value as { id?: unknown; status?: unknown; updated_at?: unknown };
    if (typeof row.id !== "string") {
      throw new Error("Invalid referral notification id");
    }
    if (row.status !== "pending" && row.status !== "sent" && row.status !== "failed") {
      throw new Error("Invalid referral notification status");
    }
    if (typeof row.updated_at !== "string") {
      throw new Error("Invalid referral notification updated timestamp");
    }

    return { id: row.id, status: row.status, updated_at: row.updated_at };
  },
};

const MemberSmsEligibilityRowSchema = {
  parse(value: unknown): {
    id: string;
    full_name: string;
    business_name: string | null;
    phone: string | null;
    sms_referral_optin: boolean | null;
  } {
    if (!value || typeof value !== "object") {
      throw new Error("Invalid BXN member SMS eligibility response");
    }

    const row = value as {
      id?: unknown;
      full_name?: unknown;
      business_name?: unknown;
      phone?: unknown;
      sms_referral_optin?: unknown;
    };

    if (typeof row.id !== "string" || typeof row.full_name !== "string") {
      throw new Error("Invalid BXN member SMS eligibility identity");
    }

    return {
      id: row.id,
      full_name: row.full_name,
      business_name: typeof row.business_name === "string" ? row.business_name : null,
      phone: typeof row.phone === "string" ? row.phone : null,
      sms_referral_optin:
        typeof row.sms_referral_optin === "boolean" ? row.sms_referral_optin : null,
    };
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
