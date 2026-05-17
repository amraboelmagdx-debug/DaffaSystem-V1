import type { StateStorage } from "zustand/middleware";
import { getHrWorkforceHybridStateStorage } from "@/lib/hr-workforce/hr-workforce-hybrid-persist-storage";
import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { touchHrCatalogLocalMeta } from "@/lib/persistence/hr-catalog-local-meta";
import {
  fingerprintHrCatalog,
  partializeHrCatalogFromState,
} from "@/lib/persistence/hr-catalog-payload";
import {
  getHrCatalogSyncState,
  getLastSyncedCatalogFingerprint,
} from "@/lib/persistence/hr-catalog-sync-state";
import { HR_WORKFORCE_BASE_KEY } from "@/lib/persistence/persist-keys";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { createTenantScopedStorage } from "@/lib/persistence/tenant-storage";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import type { HrWorkforceCatalogPayload } from "@/server/validation/hr-catalog-schema";

function catalogFromPersistBlob(value: string): HrWorkforceCatalogPayload | null {
  try {
    const parsed = JSON.parse(value) as { state?: Record<string, unknown> };
    const raw = parsed.state ?? (parsed as unknown as Record<string, unknown>);
    if (!raw || typeof raw !== "object") return null;
    return partializeHrCatalogFromState(raw as Parameters<typeof partializeHrCatalogFromState>[0]);
  } catch {
    return null;
  }
}

/**
 * HR persist storage: tenant-scoped hybrid localStorage/disk + localSavedAt sidecar on write.
 * Drops queued persist writes that lag behind in-memory state (prevents stale meta + blob).
 */
export function createHrCatalogTenantStorage(): StateStorage {
  const inner = createTenantScopedStorage(HR_WORKFORCE_BASE_KEY, getHrWorkforceHybridStateStorage());

  return {
    getItem: (name) => inner.getItem(name),
    setItem: async (name, value) => {
      const orgId = getActiveOrganizationId();
      const incoming = catalogFromPersistBlob(value);
      const current = partializeHrCatalogFromState(useHrWorkforceStore.getState());

      if (
        shouldSyncToServer() &&
        incoming != null &&
        fingerprintHrCatalog(incoming) !== fingerprintHrCatalog(current)
      ) {
        return;
      }

      await inner.setItem(name, value);

      if (!orgId) return;

      const fp = fingerprintHrCatalog(current);
      const syncedFp = getLastSyncedCatalogFingerprint();
      const serverAt = getHrCatalogSyncState().lastKnownServerUpdatedAt;

      if (syncedFp && fp === syncedFp && serverAt) {
        touchHrCatalogLocalMeta(orgId, serverAt);
      } else {
        touchHrCatalogLocalMeta(orgId);
      }
    },
    removeItem: (name) => inner.removeItem(name),
  };
}
