import {
  fingerprintServiceCatalog,
  partializeServiceCatalogFromState,
} from "@/lib/persistence/service-catalog-payload";
import { touchServiceCatalogLocalMeta } from "@/lib/persistence/service-catalog-local-meta";
import { SERVICE_ARCHITECTURE_BASE_KEY, tenantPersistKey } from "@/lib/persistence/persist-keys";
import { setLastSyncedServiceCatalogFingerprint } from "@/lib/persistence/service-catalog-sync-state";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";

const PERSIST_VERSION = 0;

export function writeServiceCatalogLocalPersistSnapshot(
  organizationId: string,
  localSavedAt: string
): void {
  if (typeof window === "undefined") return;

  const partialized = partializeServiceCatalogFromState(useServiceArchitectureStore.getState());
  const key = tenantPersistKey(organizationId, SERVICE_ARCHITECTURE_BASE_KEY);
  const value = JSON.stringify({ state: partialized, version: PERSIST_VERSION });

  window.localStorage.setItem(key, value);
  touchServiceCatalogLocalMeta(organizationId, localSavedAt);
  setLastSyncedServiceCatalogFingerprint(fingerprintServiceCatalog(partialized));
}
