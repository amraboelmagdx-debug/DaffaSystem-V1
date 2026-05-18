import { executeServiceCatalogPendingUplift } from "@/lib/persistence/execute-service-catalog-uplift";
import {
  installServiceCatalogDualWrite,
  seedServiceCatalogServerUpdatedAt,
  setServiceCatalogSyncPaused,
} from "@/lib/persistence/service-catalog-dual-write";
import type { ServiceHydrationResult } from "@/lib/persistence/hydrate-service-catalog";
import {
  fingerprintServiceCatalog,
  partializeServiceCatalogFromState,
} from "@/lib/persistence/service-catalog-payload";
import {
  patchServiceCatalogSyncState,
  setLastSyncedServiceCatalogFingerprint,
  setServiceCatalogLastKnownServerUpdatedAt,
} from "@/lib/persistence/service-catalog-sync-state";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";

function agentLog(step: string, data?: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
    body: JSON.stringify({
      sessionId: "f77448",
      hypothesisId: "G",
      location: "finish-service-catalog-persistence-setup.ts",
      message: step,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export async function finishServiceCatalogPersistenceSetup(
  organizationId: string,
  sa: ServiceHydrationResult
): Promise<void> {
  agentLog("finishSa:start", { organizationId });
  patchServiceCatalogSyncState({
    syncStatus: "idle",
    lastError: null,
  });
  setServiceCatalogSyncPaused(true);

  if (sa.serverUpdatedAt) {
    if (sa.source === "server") {
      seedServiceCatalogServerUpdatedAt(sa.serverUpdatedAt);
    } else {
      setServiceCatalogLastKnownServerUpdatedAt(sa.serverUpdatedAt);
    }
  } else if (sa.source === "local" && !sa.pendingUplift) {
    const catalog = partializeServiceCatalogFromState(useServiceArchitectureStore.getState());
    setLastSyncedServiceCatalogFingerprint(fingerprintServiceCatalog(catalog));
  }

  if (shouldSyncToServer()) {
    agentLog("finishSa:uplift-start", { organizationId });
    await executeServiceCatalogPendingUplift(organizationId);
    agentLog("finishSa:uplift-done", { organizationId });
    installServiceCatalogDualWrite();
  }

  setServiceCatalogSyncPaused(false);
  agentLog("finishSa:done", { organizationId });
}
