export type AuthUserLike = { email?: string | null; user_metadata?: { full_name?: string | null } | null };

export function getDisplayName(
  profile: { full_name?: string | null } | null | undefined,
  authUser: AuthUserLike | null | undefined
): string | null {
  const profName = profile?.full_name?.trim();
  if (profName) return profName;
  const metaName = authUser?.user_metadata?.full_name?.trim?.();
  if (metaName) return metaName as string;
  return authUser?.email ?? null;
}

export function formatDateTime(date?: string | null, time?: string | null): string {
  if (!date && !time) return '';
  return `${date ?? ''}${date && time ? ' ' : ''}${time ?? ''}`.trim();
}

export function formatPhoneForDisplay(e164?: string | null): string {
  if (!e164) return '';
  // Minimal display: group with spaces for readability
  return e164.replace(/(\+\d{1,3})(\d{3})(\d{3,})/, (_m, c, a, b) => `${c} ${a} ${b}`);
}
