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

export async function finishServiceCatalogPersistenceSetup(
  organizationId: string,
  sa: ServiceHydrationResult
): Promise<void> {
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
    await executeServiceCatalogPendingUplift(organizationId);
    installServiceCatalogDualWrite();
  }

  setServiceCatalogSyncPaused(false);
}
