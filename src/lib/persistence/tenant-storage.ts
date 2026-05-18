import type { StateStorage } from "zustand/middleware";
import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { recordHrPersistKeyResolution } from "@/lib/persistence/hr-hydration-debug";
import {
  HR_WORKFORCE_BASE_KEY,
  legacyPersistKeyForBase,
  tenantPersistKey,
} from "@/lib/persistence/persist-keys";
import { isTenantNamespacedPersistEnabled, shouldSyncToServer } from "@/lib/persistence/persist-mode";

function defaultLocalStorageAdapter(): StateStorage {
  return {
    getItem: (name) => {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(name);
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(name, value);
    },
    removeItem: (name) => {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(name);
    },
  };
}

/** Resolves the physical storage key for the current tenant + base suffix. */
export function resolvePersistStorageKey(baseKey: string): string | null {
  const namespacedEnabled = isTenantNamespacedPersistEnabled();
  const orgId = getActiveOrganizationId();

  let key: string | null;
  if (
    namespacedEnabled &&
    baseKey === HR_WORKFORCE_BASE_KEY &&
    shouldSyncToServer() &&
    !orgId
  ) {
    key = null;
  } else if (!namespacedEnabled || !orgId) {
    key = legacyPersistKeyForBase(baseKey);
  } else {
    key = tenantPersistKey(orgId, baseKey);
  }

  if (baseKey === HR_WORKFORCE_BASE_KEY) {
    recordHrPersistKeyResolution({
      namespacedPersistEnabled: namespacedEnabled,
      activeOrganizationId: orgId,
      lastResolvedHrPersistKey: key ?? "",
      usingLegacyFallback: key != null && key === legacyPersistKeyForBase(baseKey),
    });
  }

  return key;
}

/**
 * Wraps Zustand persist storage so reads/writes use `efp-{orgId}-{baseKey}` when an
 * active organization is set. Falls back to legacy global keys when org is unset.
 */
export function createTenantScopedStorage(
  baseKey: string,
  inner: StateStorage = defaultLocalStorageAdapter()
): StateStorage {
  return {
    getItem: async (_zustandName) => {
      const key = resolvePersistStorageKey(baseKey);
      if (!key) return null;
      return inner.getItem(key);
    },
    setItem: async (_zustandName, value) => {
      const key = resolvePersistStorageKey(baseKey);
      if (!key) return;
      return inner.setItem(key, value);
    },
    removeItem: async (_zustandName) => {
      const key = resolvePersistStorageKey(baseKey);
      if (!key) return;
      return inner.removeItem(key);
    },
  };
}
