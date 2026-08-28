const BXN_PROFILE_BASE_URL = "https://bxnmembers.com/user";

export function deriveBxnProfileUrlFromName(fullName: string): string | null {
  const parts = fullName
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean);

  if (parts.length < 2) return null;

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  if (!firstName || !lastName) return null;

  return `${BXN_PROFILE_BASE_URL}/${encodeURIComponent(firstName)}.${encodeURIComponent(lastName)}/`;
}

export function resolveBxnProfileUrl(
  fullName: string,
  profileUrl: string | null | undefined,
): string | null {
  const canonical = profileUrl?.trim();
  if (canonical) return canonical;

  return deriveBxnProfileUrlFromName(fullName);
}
