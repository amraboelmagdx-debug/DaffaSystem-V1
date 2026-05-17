/** Zustand persist `name` values (legacy global keys). */
export const LEGACY_HR_WORKFORCE_PERSIST_NAME = "efp-hr-workforce";
export const LEGACY_SERVICE_ARCHITECTURE_PERSIST_NAME = "efp-service-architecture-v1";

/** Base suffix for tenant-scoped keys: `efp-{orgId}-{baseKey}`. */
export const HR_WORKFORCE_BASE_KEY = "hr-workforce";
export const SERVICE_ARCHITECTURE_BASE_KEY = "service-architecture-v1";
export const WORKSPACE_BASE_KEY = "workspace";
export const LEGACY_WORKSPACE_PERSIST_NAME = "efp-workspace";

export function tenantPersistKey(organizationId: string, baseKey: string): string {
  return `efp-${organizationId}-${baseKey}`;
}

export function legacyPersistKeyForBase(baseKey: string): string {
  if (baseKey === HR_WORKFORCE_BASE_KEY) return LEGACY_HR_WORKFORCE_PERSIST_NAME;
  if (baseKey === SERVICE_ARCHITECTURE_BASE_KEY) return LEGACY_SERVICE_ARCHITECTURE_PERSIST_NAME;
  if (baseKey === WORKSPACE_BASE_KEY) return LEGACY_WORKSPACE_PERSIST_NAME;
  return `efp-${baseKey}`;
}

export function legacyMigratedSessionKey(organizationId: string): string {
  return `efp-legacy-migrated-${organizationId}`;
}
