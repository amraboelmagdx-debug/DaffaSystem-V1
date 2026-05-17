import { SERVICE_ARCHITECTURE_BASE_KEY, tenantPersistKey } from "@/lib/persistence/persist-keys";

export type ServiceCatalogLocalMeta = {
  localSavedAt: string;
};

const META_SUFFIX = "service-architecture-meta";

export function serviceCatalogLocalMetaKey(organizationId: string): string {
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

export function readServiceCatalogLocalMeta(organizationId: string): ServiceCatalogLocalMeta | null {
  const raw = readRaw(serviceCatalogLocalMetaKey(organizationId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceCatalogLocalMeta;
    if (typeof parsed.localSavedAt === "string") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function touchServiceCatalogLocalMeta(
  organizationId: string,
  at: string = new Date().toISOString()
): void {
  writeRaw(
    serviceCatalogLocalMetaKey(organizationId),
    JSON.stringify({ localSavedAt: at } satisfies ServiceCatalogLocalMeta)
  );
}

export function parseServiceCatalogLocalSavedAtMs(organizationId: string): number {
  const meta = readServiceCatalogLocalMeta(organizationId);
  if (!meta?.localSavedAt) return 0;
  const ms = Date.parse(meta.localSavedAt);
  return Number.isFinite(ms) ? ms : 0;
}

export function ensureServiceCatalogLocalMetaFromPersistBlob(
  organizationId: string,
  persistBlob: string | null
): void {
  if (!persistBlob?.trim()) return;
  const existing = readServiceCatalogLocalMeta(organizationId);
  if (existing?.localSavedAt) return;
  touchServiceCatalogLocalMeta(organizationId);
}

export { SERVICE_ARCHITECTURE_BASE_KEY };
