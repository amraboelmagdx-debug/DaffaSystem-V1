import {
  legacyMigratedSessionKey,
  legacyPersistKeyForBase,
  SERVICE_ARCHITECTURE_BASE_KEY,
  tenantPersistKey,
  WORKSPACE_BASE_KEY,
} from "@/lib/persistence/persist-keys";
import { isTenantNamespacedPersistEnabled } from "@/lib/persistence/persist-mode";

function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function hasLegacyMigratedFlag(organizationId: string): boolean {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(legacyMigratedSessionKey(organizationId)) === "1";
}

function setLegacyMigratedFlag(organizationId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(legacyMigratedSessionKey(organizationId), "1");
}

/**
 * One-time copy from global legacy key to namespaced key for one base suffix.
 * Does not delete the legacy global key.
 */
export function migrateLegacyPersistForBase(
  organizationId: string,
  baseKey: string
): boolean {
  if (!isTenantNamespacedPersistEnabled()) return false;
  if (typeof window === "undefined") return false;

  const namespacedKey = tenantPersistKey(organizationId, baseKey);
  const existing = readLocalStorage(namespacedKey);
  if (existing != null && existing !== "") {
    return false;
  }

  const legacyKey = legacyPersistKeyForBase(baseKey);
  const legacy = readLocalStorage(legacyKey);
  if (legacy == null || legacy === "") {
    return false;
  }

  writeLocalStorage(namespacedKey, legacy);
  return true;
}

/**
 * Migrate SA legacy global once per organization session.
 * HR legacy is never copied — server + tenant-scoped keys are authoritative under dual_write.
 */
export function migrateLegacyPersistForOrganization(organizationId: string): void {
  if (!isTenantNamespacedPersistEnabled()) return;
  if (typeof window === "undefined") return;
  if (hasLegacyMigratedFlag(organizationId)) return;

  migrateLegacyPersistForBase(organizationId, SERVICE_ARCHITECTURE_BASE_KEY);
  migrateLegacyPersistForBase(organizationId, WORKSPACE_BASE_KEY);
  setLegacyMigratedFlag(organizationId);
}
