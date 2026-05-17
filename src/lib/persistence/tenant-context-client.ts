export type TenantContextClient = {
  activeOrganizationId: string;
  activeOrganizationName?: string;
};

/**
 * Loads active tenant from API. In dev without auth, optional NEXT_PUBLIC_DEV_TENANT_ID fallback.
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
  if (devOrgId && process.env.NODE_ENV === "development") {
    return {
      activeOrganizationId: devOrgId,
      activeOrganizationName: process.env.NEXT_PUBLIC_DEV_TENANT_NAME?.trim() || "Dev Organization",
    };
  }

  return null;
}
