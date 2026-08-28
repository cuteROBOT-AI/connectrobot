import type {
  NetworkingDnaResponse,
  ReferralPlanSnapshotResponse,
  TextReferralPlanResponse,
} from "./types";

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String(body.error)
        : "I’m having trouble reaching the recommendation service.";
    throw new Error(message);
  }

  return body as T;
}

export async function createConnectRobotSession(): Promise<string> {
  const response = await fetch("/api/connectrobot/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ initial_summary: "" }),
  });
  const body = await parseApiResponse<{ session_id: string }>(response);
  return body.session_id;
}

export async function sendConnectRobotMessage(
  sessionId: string,
  message: string,
): Promise<NetworkingDnaResponse> {
  const response = await fetch(
    `/api/connectrobot/session/${encodeURIComponent(sessionId)}/message`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    },
  );

  return parseApiResponse<NetworkingDnaResponse>(response);
}

export async function createReferralPlanSnapshot(
  sessionId: string,
): Promise<ReferralPlanSnapshotResponse> {
  const response = await fetch("/api/connectrobot/referral-plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });

  return parseApiResponse<ReferralPlanSnapshotResponse>(response);
}

export async function fetchReferralPlanSnapshot(
  token: string,
): Promise<ReferralPlanSnapshotResponse> {
  const response = await fetch(
    `/api/connectrobot/referral-plan/${encodeURIComponent(token)}`,
  );

  return parseApiResponse<ReferralPlanSnapshotResponse>(response);
}

export async function sendReferralPlanText(input: {
  sessionId: string;
  name: string;
  phone: string;
}): Promise<TextReferralPlanResponse> {
  const response = await fetch("/api/connectrobot/referral-plan/text", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      session_id: input.sessionId,
      name: input.name,
      phone: input.phone,
    }),
  });

  return parseApiResponse<TextReferralPlanResponse>(response);
}
