export interface SmsDeliveryRequest {
  to: string;
  text: string;
}

export interface SmsDeliveryService {
  send(request: SmsDeliveryRequest): Promise<void>;
}

export class TelnyxSmsDeliveryService implements SmsDeliveryService {
  constructor(
    private readonly apiKey: string,
    private readonly fromNumber: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(request: SmsDeliveryRequest): Promise<void> {
    const response = await this.fetchImpl("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromNumber,
        to: request.to,
        text: request.text,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(
        `Telnyx SMS delivery failed with status ${response.status}${
          details ? `: ${details.slice(0, 240)}` : ""
        }`,
      );
    }
  }
}

export function buildReferralPlanSmsText({
  name,
  snapshotUrl,
}: {
  name: string;
  snapshotUrl: string;
}): string {
  const trimmedName = name.trim();
  const greeting = trimmedName ? `Hi ${trimmedName}` : "Hi";
  return `${greeting} - here are the BXN recommendations you created with ConnectROBOT: ${snapshotUrl}`;
}
