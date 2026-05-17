export type PersistMode = "local_only" | "dual_write" | "server_authoritative";

const VALID_MODES: PersistMode[] = ["local_only", "dual_write", "server_authoritative"];

function parsePersistMode(raw: string | undefined): PersistMode {
  if (raw && VALID_MODES.includes(raw as PersistMode)) {
    return raw as PersistMode;
  }
  return "local_only";
}

export function getPersistMode(): PersistMode {
  return parsePersistMode(process.env.NEXT_PUBLIC_PERSIST_MODE);
}

/** True when `dual_write` or `server_authoritative` (Phase 2.2+). */
export function shouldSyncToServer(): boolean {
  const mode = getPersistMode();
  return mode === "dual_write" || mode === "server_authoritative";
}

/**
 * Phase 2.1+: read HR catalog from server (decoupled from write/sync mode).
 * Default on unless `NEXT_PUBLIC_HR_SERVER_HYDRATE=false`.
 */
export function shouldHydrateHrCatalogFromServer(): boolean {
  const raw = process.env.NEXT_PUBLIC_HR_SERVER_HYDRATE;
  if (raw === "false" || raw === "0") return false;
  return true;
}

/** Phase 2.3+: read service catalog from server (default on unless disabled). */
export function shouldHydrateServiceCatalogFromServer(): boolean {
  const raw = process.env.NEXT_PUBLIC_SA_SERVER_HYDRATE;
  if (raw === "false" || raw === "0") return false;
  return true;
}

/** @deprecated Use shouldHydrateHrCatalogFromServer */
export function shouldHydrateFromServer(): boolean {
  return shouldHydrateHrCatalogFromServer();
}

export function isTenantNamespacedPersistEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST;
  if (raw === "false" || raw === "0") return false;
  return true;
}
