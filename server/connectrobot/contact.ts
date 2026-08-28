import { z } from "zod/v4";

export const SessionContactInputSchema = z.object({
  session_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().min(7).max(32).optional(),
});

export type SessionContactInput = z.infer<typeof SessionContactInputSchema>;

export function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || null;
}

export function normalizeUsPhone(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  throw new Error("Enter a valid mobile number.");
}
