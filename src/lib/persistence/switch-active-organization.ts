import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import { hrHydrationDebugLog } from "@/lib/persistence/hr-hydration-debug";
import {
  type EconomicsHydrationResult,
  prepareEconomicsStoresForOrganization,
} from "@/lib/persistence/hydrate-economics-stores";

export type SwitchOrganizationResult = {
  activeOrganizationId: string;
  activeOrganizationName?: string;
  economics: EconomicsHydrationResult;
};

/**
 * Switches active org via API (sets cookie) then rehydrates economics stores for that tenant.
 */
export async function switchActiveOrganization(
  organizationId: string
): Promise<SwitchOrganizationResult> {
  hrHydrationDebugLog("org switch", { organizationId });
  const previousOrgId = getActiveOrganizationId();
  if (previousOrgId && previousOrgId !== organizationId) {
    await flushHrCatalogSync(previousOrgId, { keepalive: true });
  }
  const res = await fetch("/api/tenant/switch", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      typeof err === "object" && err !== null && "error" in err
        ? JSON.stringify((err as { error: unknown }).error)
        : res.statusText;
    throw new Error(message || `Failed to switch organization (${res.status})`);
  }

  const body = (await res.json()) as {
    activeOrganizationId: string;
    activeOrganizationName?: string;
  };

  const economics = await prepareEconomicsStoresForOrganization(body.activeOrganizationId);

  return {
    activeOrganizationId: body.activeOrganizationId,
    activeOrganizationName: body.activeOrganizationName,
    economics,
  };
}
