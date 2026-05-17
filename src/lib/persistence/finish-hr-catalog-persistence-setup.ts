import { executeHrCatalogPendingUplift } from "@/lib/persistence/execute-hr-catalog-uplift";
import {
  installHrCatalogDualWrite,
  seedHrCatalogServerUpdatedAt,
  setHrCatalogSyncPaused,
} from "@/lib/persistence/hr-catalog-dual-write";
import type { HrHydrationResult } from "@/lib/persistence/hydrate-hr-catalog";
import {
  fingerprintHrCatalog,
  partializeHrCatalogFromState,
} from "@/lib/persistence/hr-catalog-payload";
import {
  patchHrCatalogSyncState,
  setLastKnownServerUpdatedAt,
  setLastSyncedCatalogFingerprint,
} from "@/lib/persistence/hr-catalog-sync-state";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";

/**
 * Post-hydrate: seed server timestamp, run pending uplift, enable debounced dual-write.
 */
export async function finishHrCatalogPersistenceSetup(
  organizationId: string,
  hr: HrHydrationResult
): Promise<void> {
  patchHrCatalogSyncState({
    syncStatus: "idle",
    lastError: null,
  });
  setHrCatalogSyncPaused(true);

  if (hr.serverUpdatedAt) {
    if (hr.source === "server") {
      seedHrCatalogServerUpdatedAt(hr.serverUpdatedAt);
    } else {
      setLastKnownServerUpdatedAt(hr.serverUpdatedAt);
    }
  } else if (hr.source === "local" && !hr.pendingUplift) {
    const catalog = partializeHrCatalogFromState(useHrWorkforceStore.getState());
    setLastSyncedCatalogFingerprint(fingerprintHrCatalog(catalog));
  }

  if (shouldSyncToServer()) {
    await executeHrCatalogPendingUplift(organizationId);
    installHrCatalogDualWrite();
  }

  setHrCatalogSyncPaused(false);
}
