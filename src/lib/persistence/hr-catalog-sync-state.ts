export type HrCatalogSyncStatus = "idle" | "pending" | "synced" | "error";

export type HrCatalogSyncState = {
  syncStatus: HrCatalogSyncStatus;
  lastLocalSaveAt: string | null;
  lastServerSyncAt: string | null;
  lastKnownServerUpdatedAt: string | null;
  /** Catalog JSON fingerprint last acknowledged by a successful PUT. */
  lastSyncedCatalogFingerprint: string | null;
  lastError: string | null;
};

const INITIAL: HrCatalogSyncState = {
  syncStatus: "idle",
  lastLocalSaveAt: null,
  lastServerSyncAt: null,
  lastKnownServerUpdatedAt: null,
  lastSyncedCatalogFingerprint: null,
  lastError: null,
};

let state: HrCatalogSyncState = { ...INITIAL };
const listeners = new Set<(next: HrCatalogSyncState) => void>();

function emit(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function getHrCatalogSyncState(): HrCatalogSyncState {
  return state;
}

export function subscribeHrCatalogSyncState(
  listener: (next: HrCatalogSyncState) => void
): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function resetHrCatalogSyncState(): void {
  state = { ...INITIAL };
  emit();
}

export function patchHrCatalogSyncState(patch: Partial<HrCatalogSyncState>): void {
  state = { ...state, ...patch };
  emit();
}

export function setHrCatalogSyncPending(): void {
  patchHrCatalogSyncState({ syncStatus: "pending", lastError: null });
}

export function setHrCatalogSyncSynced(meta: {
  updatedAt: string;
  localSavedAt?: string | null;
}): void {
  patchHrCatalogSyncState({
    syncStatus: "synced",
    lastServerSyncAt: meta.updatedAt,
    lastKnownServerUpdatedAt: meta.updatedAt,
    lastLocalSaveAt: meta.localSavedAt ?? state.lastLocalSaveAt,
    lastError: null,
  });
}

export function setHrCatalogSyncError(message: string): void {
  patchHrCatalogSyncState({ syncStatus: "error", lastError: message });
}

export function setLastKnownServerUpdatedAt(updatedAt: string): void {
  patchHrCatalogSyncState({ lastKnownServerUpdatedAt: updatedAt });
}

export function getLastSyncedCatalogFingerprint(): string | null {
  return state.lastSyncedCatalogFingerprint;
}

export function setLastSyncedCatalogFingerprint(fingerprint: string | null): void {
  patchHrCatalogSyncState({ lastSyncedCatalogFingerprint: fingerprint });
}

export function setLastLocalSaveAt(iso: string): void {
  patchHrCatalogSyncState({ lastLocalSaveAt: iso });
}
