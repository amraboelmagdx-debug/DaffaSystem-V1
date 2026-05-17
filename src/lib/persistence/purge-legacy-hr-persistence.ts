import { hrCatalogUpliftSessionKey } from "@/lib/persistence/hr-catalog-uplift";
import {
  HR_WORKFORCE_BASE_KEY,
  LEGACY_HR_WORKFORCE_PERSIST_NAME,
  legacyMigratedSessionKey,
  tenantPersistKey,
} from "@/lib/persistence/persist-keys";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { hrHydrationDebugLog } from "@/lib/persistence/hr-hydration-debug";

const DISK_API = "/api/dev/hr-workforce-disk";

/**
 * Removes global HR persist keys and dev disk mirror so only tenant-scoped storage is used.
 * If namespaced storage is empty but legacy still holds data, copies legacy → namespaced once
 * before removal (salvage). Call after `setActiveOrganizationId` when server sync is enabled.
 */
export function purgeLegacyHrPersistenceRemnants(organizationId: string): void {
  if (typeof window === "undefined") return;
  if (!shouldSyncToServer()) return;

  const namespacedKey = tenantPersistKey(organizationId, HR_WORKFORCE_BASE_KEY);
  const legacy = window.localStorage.getItem(LEGACY_HR_WORKFORCE_PERSIST_NAME);
  const namespaced = window.localStorage.getItem(namespacedKey);

  if (legacy?.trim() && (!namespaced || namespaced.trim() === "")) {
    window.localStorage.setItem(namespacedKey, legacy);
    hrHydrationDebugLog("salvaged legacy HR blob into namespaced key before purge", {
      organizationId,
      namespacedKey,
    });
  }

  window.localStorage.removeItem(LEGACY_HR_WORKFORCE_PERSIST_NAME);
  window.sessionStorage.removeItem(legacyMigratedSessionKey(organizationId));
  window.sessionStorage.removeItem(hrCatalogUpliftSessionKey(organizationId));

  if (process.env.NODE_ENV === "development") {
    void fetch(DISK_API, { method: "DELETE" }).catch(() => {});
  }

  hrHydrationDebugLog("purged legacy HR persistence remnants", {
    organizationId,
    removedLegacyKey: LEGACY_HR_WORKFORCE_PERSIST_NAME,
  });
}
