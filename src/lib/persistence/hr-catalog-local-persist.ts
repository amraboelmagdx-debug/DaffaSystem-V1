import {
  fingerprintHrCatalog,
  partializeHrCatalogFromState,
} from "@/lib/persistence/hr-catalog-payload";
import { touchHrCatalogLocalMeta } from "@/lib/persistence/hr-catalog-local-meta";
import { HR_WORKFORCE_BASE_KEY, tenantPersistKey } from "@/lib/persistence/persist-keys";
import { setLastSyncedCatalogFingerprint } from "@/lib/persistence/hr-catalog-sync-state";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

const PERSIST_VERSION = 0;

/**
 * Writes the current in-memory HR catalog to the tenant namespaced localStorage key.
 * Bypasses Zustand's async persist queue so refresh cannot rehydrate a stale blob.
 */
export function writeHrCatalogLocalPersistSnapshot(
  organizationId: string,
  localSavedAt: string
): void {
  if (typeof window === "undefined") return;

  const partialized = partializeHrCatalogFromState(useHrWorkforceStore.getState());
  const key = tenantPersistKey(organizationId, HR_WORKFORCE_BASE_KEY);
  const value = JSON.stringify({ state: partialized, version: PERSIST_VERSION });

  window.localStorage.setItem(key, value);
  touchHrCatalogLocalMeta(organizationId, localSavedAt);
  setLastSyncedCatalogFingerprint(fingerprintHrCatalog(partialized));
}
