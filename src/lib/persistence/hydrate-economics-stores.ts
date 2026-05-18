import { setActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { hrHydrationDebugLog } from "@/lib/persistence/hr-hydration-debug";
import { recordHydrationStep } from "@/lib/persistence/platform-persistence-debug";
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
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { rehydrateWorkspaceStore } from "@/stores/use-workspace-store";

export type EconomicsHydrationResult = {
  hr: HrHydrationResult;
  sa: ServiceHydrationResult;
};

let rehydrateChain: Promise<void> = Promise.resolve();

function agentLogStep(step: string, data?: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
    body: JSON.stringify({
      sessionId: "f77448",
      hypothesisId: "F",
      location: "hydrate-economics-stores.ts",
      message: step,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

async function rehydratePersistedStores(): Promise<void> {
  const run = () =>
    Promise.all([
      useHrWorkforceStore.persist.rehydrate(),
      useServiceArchitectureStore.persist.rehydrate(),
      rehydrateWorkspaceStore(),
    ]).then(() => undefined);

  const next = rehydrateChain.then(run, run);
  rehydrateChain = next.then(
    () => undefined,
    () => undefined
  );
  await next;
}

/** Prepare HR + Service Architecture stores for the active organization. */
export async function prepareEconomicsStoresForOrganization(
  organizationId: string
): Promise<EconomicsHydrationResult> {
  hrHydrationDebugLog("economics prepare start", { organizationId });
  recordHydrationStep("1:setActiveOrganizationId");
  setActiveOrganizationId(organizationId);
  purgeLegacyHrPersistenceRemnants(organizationId);
  clearInMemoryEconomicsBleed();
  agentLogStep("prepare:rehydrate-1-start", { organizationId });
  await rehydratePersistedStores();
  agentLogStep("prepare:rehydrate-1-done", { organizationId });
  recordHydrationStep("2:zustandRehydrate");
  migrateLegacyPersistForOrganization(organizationId);
  agentLogStep("prepare:rehydrate-2-start", { organizationId });
  await rehydratePersistedStores();
  agentLogStep("prepare:rehydrate-2-done", { organizationId });
  hrHydrationDebugLog("local rehydrate complete", { organizationId });

  recordHydrationStep("3:hrHydrate");
  agentLogStep("prepare:hr-server-start", { organizationId });
  const hr = await hydrateHrCatalogFromServer(organizationId);
  agentLogStep("prepare:hr-server-done", { organizationId, status: hr.status });

  recordHydrationStep("4:serviceHydrate");
  agentLogStep("prepare:sa-server-start", { organizationId });
  const sa = await hydrateServiceCatalogFromServer(organizationId);
  agentLogStep("prepare:sa-server-done", { organizationId, status: sa.status });

  return { hr, sa };
}

export { HR_HYDRATION_IDLE, SERVICE_HYDRATION_IDLE };
