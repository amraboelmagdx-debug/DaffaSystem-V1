import { createRouteSupabaseClient } from "@/lib/supabase/route-handler";
import { readActiveOrganizationId } from "./cookies";
import { TenantAuthError, TenantForbiddenError } from "./errors";
import {
  membershipForOrganization,
  resolveActiveOrganizationId,
} from "./resolve-active-org";
import type { AppRole, TenantContext, TenantMembership } from "./types";

function isProductionDeployment(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
  );
}

function devTenantBypassAllowed(): boolean {
  if (isProductionDeployment()) return false;
  return Boolean(process.env.DEV_TENANT_ID?.trim());
}

function parseAppRole(value: unknown): AppRole {
  const roles: AppRole[] = [
    "admin",
    "executive",
    "finance_manager",
    "sales_director",
    "analyst",
    "viewer",
  ];
  if (typeof value === "string" && roles.includes(value as AppRole)) {
    return value as AppRole;
  }
  return "viewer";
}

type MemberRow = {
  role: string;
  organization_id: string;
  organizations: { id: string; name: string } | { id: string; name: string }[] | null;
};

function rowToMembership(row: MemberRow): TenantMembership | null {
  const org = Array.isArray(row.organizations)
    ? row.organizations[0]
    : row.organizations;
  if (!org?.id) return null;
  return {
    organizationId: row.organization_id,
    organizationName: org.name,
    role: parseAppRole(row.role),
  };
}

async function loadMemberships(
  supabase: NonNullable<Awaited<ReturnType<typeof createRouteSupabaseClient>>>,
  userId: string
): Promise<TenantMembership[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organization_id, organizations(id, name)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => rowToMembership(row as MemberRow))
    .filter((m): m is TenantMembership => m != null);
}

async function devBypassContext(): Promise<TenantContext | null> {
  if (!devTenantBypassAllowed()) return null;

  const organizationId = process.env.DEV_TENANT_ID!.trim();
  const userId = process.env.DEV_USER_ID?.trim() || "00000000-0000-4000-8000-000000000099";
  const organizationName = process.env.DEV_TENANT_NAME?.trim() || "Dev Organization";

  const membership: TenantMembership = {
    organizationId,
    organizationName,
    role: "admin",
  };

  return {
    userId,
    organizationId,
    organizationName,
    role: "admin",
    memberships: [membership],
  };
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createRouteSupabaseClient();
  if (!supabase) {
    return devBypassContext();
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return devBypassContext();
  }

  const memberships = await loadMemberships(supabase, user.id);
  if (!memberships.length) {
    return null;
  }

  const cookieOrgId = await readActiveOrganizationId();
  const activeOrgId = resolveActiveOrganizationId(memberships, cookieOrgId);
  if (!activeOrgId) {
    return null;
  }

  const active = membershipForOrganization(memberships, activeOrgId);
  if (!active) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: active.organizationId,
    organizationName: active.organizationName,
    role: active.role,
    memberships,
  };
}

export async function requireTenantContext(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new TenantAuthError();
  }
  return ctx;
}

/** Validates that the user may act as the given organization (membership required). */
export function assertOrganizationMembership(
  ctx: TenantContext,
  organizationId: string
): void {
  const allowed = ctx.memberships.some((m) => m.organizationId === organizationId);
  if (!allowed) {
    throw new TenantForbiddenError();
  }
}
