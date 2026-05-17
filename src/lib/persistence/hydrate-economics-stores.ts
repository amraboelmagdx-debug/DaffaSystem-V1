import { setActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { hrHydrationDebugLog } from "@/lib/persistence/hr-hydration-debug";
import {
  type HrHydrationResult,
  HR_HYDRATION_IDLE,
  hydrateHrCatalogFromServer,
} from "@/lib/persistence/hydrate-hr-catalog";
import {
  type ServiceHydrationResult,
  SERVICE_HYDRATION_IDLE,
  hydrateServiceCatalogFromServer,
} from "@/lib/persistence/hydrate-service-catalog";
import { migrateLegacyPersistForOrganization } from "@/lib/persistence/legacy-persist-migrate";
import { purgeLegacyHrPersistenceRemnants } from "@/lib/persistence/purge-legacy-hr-persistence";
import { clearInMemoryEconomicsBleed } from "@/lib/persistence/reset-economics-stores";
import { syncEconomicsGraphFromHr } from "@/lib/platform-economics/client-sync";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";

export type EconomicsHydrationResult = {
  hr: HrHydrationResult;
  sa: ServiceHydrationResult;
};

async function rehydratePersistedStores(): Promise<void> {
  await Promise.all([
    useHrWorkforceStore.persist.rehydrate(),
    useServiceArchitectureStore.persist.rehydrate(),
  ]);
}

/** Prepare HR + Service Architecture stores for the active organization. */
export async function prepareEconomicsStoresForOrganization(
  organizationId: string
): Promise<EconomicsHydrationResult> {
  hrHydrationDebugLog("economics prepare start", { organizationId });
  setActiveOrganizationId(organizationId);
  purgeLegacyHrPersistenceRemnants(organizationId);
  clearInMemoryEconomicsBleed();
  await rehydratePersistedStores();
  migrateLegacyPersistForOrganization(organizationId);
  await rehydratePersistedStores();
  hrHydrationDebugLog("local rehydrate complete", { organizationId });

  const hr = await hydrateHrCatalogFromServer(organizationId);

  const sa = await hydrateServiceCatalogFromServer(organizationId);

  const hasHrStructure = useHrWorkforceStore.getState().businessUnits.some((b) => b.isActive);
  if (hasHrStructure) {
    try {
      await syncEconomicsGraphFromHr();
      hrHydrationDebugLog("planning workspace synced from HR catalog", { organizationId });
    } catch (err) {
      hrHydrationDebugLog("planning workspace sync failed", {
        organizationId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { hr, sa };
}

export { HR_HYDRATION_IDLE, SERVICE_HYDRATION_IDLE };
