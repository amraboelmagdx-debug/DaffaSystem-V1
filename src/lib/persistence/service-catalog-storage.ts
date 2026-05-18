import type { StateStorage } from "zustand/middleware";
import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import {
  fingerprintServiceCatalog,
  partializeServiceCatalogFromState,
} from "@/lib/persistence/service-catalog-payload";
import { touchServiceCatalogLocalMeta } from "@/lib/persistence/service-catalog-local-meta";
import {
  getLastSyncedServiceCatalogFingerprint,
  getServiceCatalogSyncState,
} from "@/lib/persistence/service-catalog-sync-state";
import { SERVICE_ARCHITECTURE_BASE_KEY } from "@/lib/persistence/persist-keys";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { createTenantScopedStorage } from "@/lib/persistence/tenant-storage";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import type { ServiceArchitectureCatalogPayload } from "@/server/validation/service-catalog-schema";

function catalogFromPersistBlob(value: string): ServiceArchitectureCatalogPayload | null {
  try {
    const parsed = JSON.parse(value) as { state?: Record<string, unknown> };
    const raw = parsed.state ?? (parsed as unknown as Record<string, unknown>);
    if (!raw || typeof raw !== "object") return null;
    return partializeServiceCatalogFromState(
      raw as unknown as Parameters<typeof partializeServiceCatalogFromState>[0]
    );
  } catch {
    return null;
  }
}

export function createServiceCatalogTenantStorage(): StateStorage {
  const inner = createTenantScopedStorage(SERVICE_ARCHITECTURE_BASE_KEY);

  return {
    getItem: (name) => inner.getItem(name),
    setItem: async (name, value) => {
      const orgId = getActiveOrganizationId();
      const incoming = catalogFromPersistBlob(value);
      const current = partializeServiceCatalogFromState(useServiceArchitectureStore.getState());

      if (
        shouldSyncToServer() &&
        incoming != null &&
        fingerprintServiceCatalog(incoming) !== fingerprintServiceCatalog(current)
      ) {
        return;
      }

      await inner.setItem(name, value);
      if (!orgId) return;

      const fp = fingerprintServiceCatalog(current);
      const syncedFp = getLastSyncedServiceCatalogFingerprint();
      const serverAt = getServiceCatalogSyncState().lastKnownServerUpdatedAt;

      if (syncedFp && fp === syncedFp && serverAt) {
        touchServiceCatalogLocalMeta(orgId, serverAt);
      } else {
        touchServiceCatalogLocalMeta(orgId);
      }
    },
    removeItem: (name) => inner.removeItem(name),
  };
}
