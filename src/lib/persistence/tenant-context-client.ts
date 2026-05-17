import { isSupabaseConfigured } from "@/lib/persistence/is-supabase-configured";

export type TenantContextClient = {
  activeOrganizationId: string;
  activeOrganizationName?: string;
  /** True when the request had a real Supabase Auth session (not dev bypass alone). */
  authenticated?: boolean;
};

function isDualWriteMode(): boolean {
  const mode = process.env.NEXT_PUBLIC_PERSIST_MODE?.trim();
  return mode === "dual_write" || mode === "server_authoritative";
}

function allowDevTenantWithoutAuth(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_DEV_TENANT_WITHOUT_AUTH === "true";
}

/**
 * Loads active tenant from API. In dev without auth, optional NEXT_PUBLIC_DEV_TENANT_ID fallback
 * only when not in dual_write + Supabase mode (planning sync requires a session).
 */
export async function fetchTenantContextClient(): Promise<TenantContextClient | null> {
  const res = await fetch("/api/tenant/context", {
    credentials: "include",
    cache: "no-store",
  });

  if (res.ok) {
    const body = (await res.json()) as TenantContextClient;
    if (body.activeOrganizationId) return body;
  }

  const devOrgId = process.env.NEXT_PUBLIC_DEV_TENANT_ID?.trim();
  if (!devOrgId || process.env.NODE_ENV !== "development") {
    return null;
  }

  const supabasePlanning =
    isSupabaseConfigured() && isDualWriteMode() && !allowDevTenantWithoutAuth();

  if (supabasePlanning) {
    return null;
  }

  return {
    activeOrganizationId: devOrgId,
    activeOrganizationName: process.env.NEXT_PUBLIC_DEV_TENANT_NAME?.trim() || "Dev Organization",
    authenticated: false,
  };
}
