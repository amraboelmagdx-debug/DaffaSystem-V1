export type ServiceCatalogSyncStatus = "idle" | "pending" | "synced" | "error";

export type ServiceCatalogSyncState = {
  syncStatus: ServiceCatalogSyncStatus;
  lastLocalSaveAt: string | null;
  lastServerSyncAt: string | null;
  lastKnownServerUpdatedAt: string | null;
  lastSyncedCatalogFingerprint: string | null;
  lastError: string | null;
};

const INITIAL: ServiceCatalogSyncState = {
  syncStatus: "idle",
  lastLocalSaveAt: null,
  lastServerSyncAt: null,
  lastKnownServerUpdatedAt: null,
  lastSyncedCatalogFingerprint: null,
  lastError: null,
};

let state: ServiceCatalogSyncState = { ...INITIAL };
const listeners = new Set<(next: ServiceCatalogSyncState) => void>();

function emit(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function getServiceCatalogSyncState(): ServiceCatalogSyncState {
  return state;
}

export function subscribeServiceCatalogSyncState(
  listener: (next: ServiceCatalogSyncState) => void
): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function resetServiceCatalogSyncState(): void {
  state = { ...INITIAL };
  emit();
}

export function patchServiceCatalogSyncState(patch: Partial<ServiceCatalogSyncState>): void {
  state = { ...state, ...patch };
  emit();
}

export function setServiceCatalogSyncPending(): void {
  patchServiceCatalogSyncState({ syncStatus: "pending", lastError: null });
}

export function setServiceCatalogSyncSynced(meta: {
  updatedAt: string;
  localSavedAt?: string | null;
}): void {
  patchServiceCatalogSyncState({
    syncStatus: "synced",
    lastServerSyncAt: meta.updatedAt,
    lastKnownServerUpdatedAt: meta.updatedAt,
    lastLocalSaveAt: meta.localSavedAt ?? state.lastLocalSaveAt,
    lastError: null,
  });
}

export function setServiceCatalogSyncError(message: string): void {
  patchServiceCatalogSyncState({ syncStatus: "error", lastError: message });
}

export function setServiceCatalogLastKnownServerUpdatedAt(updatedAt: string): void {
  patchServiceCatalogSyncState({ lastKnownServerUpdatedAt: updatedAt });
}

export function getLastSyncedServiceCatalogFingerprint(): string | null {
  return state.lastSyncedCatalogFingerprint;
}

export function setLastSyncedServiceCatalogFingerprint(fp: string): void {
  patchServiceCatalogSyncState({ lastSyncedCatalogFingerprint: fp });
}
