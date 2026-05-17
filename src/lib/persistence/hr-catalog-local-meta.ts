import { HR_WORKFORCE_BASE_KEY, tenantPersistKey } from "@/lib/persistence/persist-keys";

export type HrCatalogLocalMeta = {
  localSavedAt: string;
};

const META_SUFFIX = "hr-workforce-meta";

export function hrCatalogLocalMetaKey(organizationId: string): string {
  return tenantPersistKey(organizationId, META_SUFFIX);
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function writeRaw(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

export function readHrCatalogLocalMeta(organizationId: string): HrCatalogLocalMeta | null {
  const raw = readRaw(hrCatalogLocalMetaKey(organizationId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HrCatalogLocalMeta;
    if (typeof parsed.localSavedAt === "string") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function touchHrCatalogLocalMeta(organizationId: string, at: string = new Date().toISOString()): void {
  writeRaw(
    hrCatalogLocalMetaKey(organizationId),
    JSON.stringify({ localSavedAt: at } satisfies HrCatalogLocalMeta)
  );
}

export function parseLocalSavedAtMs(organizationId: string): number {
  const meta = readHrCatalogLocalMeta(organizationId);
  if (!meta?.localSavedAt) return 0;
  const ms = Date.parse(meta.localSavedAt);
  return Number.isFinite(ms) ? ms : 0;
}

/** After rehydrate, ensure sidecar exists if catalog blob is present. */
export function ensureHrCatalogLocalMetaFromPersistBlob(
  organizationId: string,
  persistBlob: string | null
): void {
  if (!persistBlob?.trim()) return;
  const existing = readHrCatalogLocalMeta(organizationId);
  if (existing?.localSavedAt) return;
  touchHrCatalogLocalMeta(organizationId);
}

export { HR_WORKFORCE_BASE_KEY };
