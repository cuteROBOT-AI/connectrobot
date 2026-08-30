import type { SmsDeliveryService } from "./sms.js";
import {
  ReferralPlanSnapshotPayloadSchema,
  type ReferralPlanSnapshotPayload,
  type ReferralPlanSnapshotRow,
} from "./referral-plan-schemas.js";
import type { RecommendationBoard } from "../networking-dna/schemas.js";

export const USER_REFERRAL_PLAN_SMS = "user_referral_plan_sms";
export const MEMBER_REFERRAL_SMS = "member_referral_sms";

export type ReferralNotificationRecipientType = "user" | "member";
export type ReferralNotificationStatus = "pending" | "sent" | "failed";

export interface ReferralNotificationReservation {
  id: string;
  shouldSend: boolean;
  status: ReferralNotificationStatus;
}

export interface ReserveReferralNotificationInput {
  snapshot_id: string;
  recipient_type: ReferralNotificationRecipientType;
  member_id?: string | null;
  contact_id?: string | null;
  destination_phone: string;
  notification_type: string;
}

export interface MemberSmsEligibilityRow {
  id: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  sms_referral_optin: boolean | null;
}

export interface MemberReferralSmsRecipient {
  memberId: string;
  fullName: string;
  businessName: string | null;
  phone: string;
  recommendationReason: string;
  needLabel: string;
}

export interface ReferralNotificationRepository {
  reserveNotification(
    input: ReserveReferralNotificationInput,
  ): Promise<ReferralNotificationReservation>;
  markNotificationSent(notificationId: string): Promise<void>;
  markNotificationFailed(notificationId: string, error: unknown): Promise<void>;
  listEligibleMemberSmsRecipients(
    snapshot: ReferralPlanSnapshotRow,
  ): Promise<MemberReferralSmsRecipient[]>;
}

export async function sendUserReferralPlanSmsOnce({
  repository,
  smsDelivery,
  snapshot,
  contactId,
  destinationPhone,
  text,
}: {
  repository: ReferralNotificationRepository;
  smsDelivery: SmsDeliveryService;
  snapshot: ReferralPlanSnapshotRow;
  contactId: string;
  destinationPhone: string;
  text: string;
}): Promise<"sent" | "already_sent"> {
  const reservation = await repository.reserveNotification({
    snapshot_id: snapshot.id,
    recipient_type: "user",
    contact_id: contactId,
    destination_phone: destinationPhone,
    notification_type: USER_REFERRAL_PLAN_SMS,
  });

  if (!reservation.shouldSend) return "already_sent";

  try {
    await smsDelivery.send({ to: destinationPhone, text });
    await repository.markNotificationSent(reservation.id);
    return "sent";
  } catch (error) {
    await repository.markNotificationFailed(reservation.id, error);
    throw error;
  }
}

export async function sendEligibleMemberReferralSmsNotifications({
  repository,
  smsDelivery,
  snapshot,
  snapshotUrl,
  userName,
  userPhone,
}: {
  repository: ReferralNotificationRepository;
  smsDelivery: SmsDeliveryService;
  snapshot: ReferralPlanSnapshotRow;
  snapshotUrl: string;
  userName: string;
  userPhone: string;
}): Promise<{ sent: number; skipped: number; failed: number }> {
  const recipients = await repository.listEligibleMemberSmsRecipients(snapshot);
  const result = { sent: 0, skipped: 0, failed: 0 };

  for (const recipient of recipients) {
    const reservation = await repository.reserveNotification({
      snapshot_id: snapshot.id,
      recipient_type: "member",
      member_id: recipient.memberId,
      destination_phone: recipient.phone,
      notification_type: MEMBER_REFERRAL_SMS,
    });

    if (!reservation.shouldSend) {
      result.skipped += 1;
      continue;
    }

    try {
      await smsDelivery.send({
        to: recipient.phone,
        text: buildMemberReferralSmsText({
          recipient,
          snapshot: snapshot.snapshot,
          snapshotUrl,
          userName,
          userPhone,
        }),
      });
      await repository.markNotificationSent(reservation.id);
      result.sent += 1;
    } catch (error) {
      await repository.markNotificationFailed(reservation.id, error).catch((markError) => {
        console.warn("connectrobot.memberReferralSms.statusUpdateFailed", {
          snapshot_id: snapshot.id,
          member_id: recipient.memberId,
          message: markError instanceof Error ? markError.message : String(markError),
        });
      });
      result.failed += 1;
      console.warn("connectrobot.memberReferralSms.failed", {
        snapshot_id: snapshot.id,
        member_id: recipient.memberId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export function buildMemberReferralSmsText({
  recipient,
  snapshot,
  snapshotUrl,
  userName,
  userPhone,
}: {
  recipient: MemberReferralSmsRecipient;
  snapshot: ReferralPlanSnapshotPayload;
  snapshotUrl: string;
  userName: string;
  userPhone: string;
}): string {
  const parsedSnapshot = ReferralPlanSnapshotPayloadSchema.parse(snapshot);
  const context = compactText(
    recipient.recommendationReason ||
      parsedSnapshot.scenario_summary ||
      parsedSnapshot.headline,
    150,
  );
  const recipientLabel = recipient.businessName || recipient.fullName;

  return [
    `New BXN referral for ${recipientLabel}`,
    `${userName.trim()} is looking for help with ${context}`,
    `Contact: ${userPhone}`,
    `Referral plan: ${snapshotUrl}`,
  ].join("\n\n");
}

export function getRecommendedMemberIdsFromSnapshot(
  snapshot: ReferralPlanSnapshotPayload,
): string[] {
  return getRecommendedSnapshotRecommendations(snapshot.recommendation_board).map(
    (recommendation) => recommendation.member_id,
  );
}

export function selectEligibleMemberSmsRecipients({
  snapshot,
  members,
  normalizePhone,
}: {
  snapshot: ReferralPlanSnapshotPayload;
  members: MemberSmsEligibilityRow[];
  normalizePhone: (phone: string) => string;
}): MemberReferralSmsRecipient[] {
  const recommendedByMemberId = new Map(
    getRecommendedSnapshotRecommendations(snapshot.recommendation_board).map(
      (recommendation) => [recommendation.member_id, recommendation],
    ),
  );

  const recipients: MemberReferralSmsRecipient[] = [];

  for (const member of members) {
    const recommendation = recommendedByMemberId.get(member.id);
    if (!recommendation || member.sms_referral_optin !== true || !member.phone) continue;

    try {
      recipients.push({
        memberId: member.id,
        fullName: member.full_name,
        businessName: member.business_name,
        phone: normalizePhone(member.phone),
        recommendationReason: recommendation.reason,
        needLabel: recommendation.need_label,
      });
    } catch {
      continue;
    }
  }

  return recipients;
}

export function buildRecipientKey(input: {
  recipient_type: ReferralNotificationRecipientType;
  member_id?: string | null;
  contact_id?: string | null;
}): string {
  if (input.recipient_type === "member" && input.member_id) {
    return `member:${input.member_id}`;
  }
  if (input.recipient_type === "user" && input.contact_id) {
    return `user:${input.contact_id}`;
  }
  throw new Error("Notification recipient id is required.");
}

function getRecommendedSnapshotRecommendations(board: RecommendationBoard) {
  const recommendations = board.category_groups.flatMap((group) =>
    group.recommendations.filter(
      (recommendation) => recommendation.display_tier === "recommended",
    ),
  );
  return [...new Map(recommendations.map((item) => [item.member_id, item])).values()];
}

function compactText(value: string, maxLength: number): string {
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
