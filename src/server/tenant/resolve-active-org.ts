import type { TenantMembership } from "./types";

/** Picks active org from cookie when it matches a membership; otherwise first membership (stable). */
export function resolveActiveOrganizationId(
  memberships: TenantMembership[],
  cookieOrganizationId: string | null
): string | null {
  if (!memberships.length) return null;

  const sorted = [...memberships].sort((a, b) =>
    a.organizationId.localeCompare(b.organizationId)
  );

  if (cookieOrganizationId) {
    const match = sorted.find((m) => m.organizationId === cookieOrganizationId);
    if (match) return match.organizationId;
  }

  return sorted[0]?.organizationId ?? null;
}

export function membershipForOrganization(
  memberships: TenantMembership[],
  organizationId: string
): TenantMembership | undefined {
  return memberships.find((m) => m.organizationId === organizationId);
}
