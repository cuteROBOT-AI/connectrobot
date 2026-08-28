import { z } from "zod/v4";

const OptionalEnvStringSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

export const NetworkingDnaEnvSchema = z.object({
  NETWORKING_DNA_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1),
  OPENAI_FINAL_REASONER_MODEL: OptionalEnvStringSchema,
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NETWORKING_DNA_RECENT_MESSAGE_LIMIT: z.coerce.number().int().min(1).max(50).default(12),
  TELNYX_API_KEY: OptionalEnvStringSchema,
  TELNYX_FROM_NUMBER: OptionalEnvStringSchema,
});

export type NetworkingDnaEnv = z.infer<typeof NetworkingDnaEnvSchema>;

export function readNetworkingDnaEnv(source: NodeJS.ProcessEnv = process.env): NetworkingDnaEnv {
  return NetworkingDnaEnvSchema.parse(source);
}

export function getBearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function isAuthorizedNetworkingDnaRequest(
  headers: Headers,
  apiKey: string | undefined,
): boolean {
  if (!apiKey) return false;
  const headerKey = headers.get("x-networking-dna-api-key")?.trim();
  const bearerKey = getBearerToken(headers.get("authorization"));
  return headerKey === apiKey || bearerKey === apiKey;
}
