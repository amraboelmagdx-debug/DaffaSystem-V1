import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { fetchHrCatalog } from "@/lib/persistence/fetch-hr-catalog";
import {
  fingerprintHrCatalog,
  partializeHrCatalogFromState,
} from "@/lib/persistence/hr-catalog-payload";
import { writeHrCatalogLocalPersistSnapshot } from "@/lib/persistence/hr-catalog-local-persist";
import { readHrCatalogLocalMeta } from "@/lib/persistence/hr-catalog-local-meta";
import { clearHrCatalogPendingServerUplift } from "@/lib/persistence/hr-catalog-uplift";
import {
  getHrCatalogSyncState,
  setHrCatalogSyncError,
  setHrCatalogSyncPending,
  setHrCatalogSyncSynced,
  setLastKnownServerUpdatedAt,
  setLastSyncedCatalogFingerprint,
} from "@/lib/persistence/hr-catalog-sync-state";
import { putHrCatalog, type PutHrCatalogResult } from "@/lib/persistence/put-hr-catalog";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

const DEBOUNCE_MS = 500;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

let syncPaused = true;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
/** Serializes all flushes so out-of-order PUTs cannot overwrite newer server rows. */
let flushChain: Promise<void> = Promise.resolve();
/** Coalesces debounced flushes; payload is always read fresh from the store at send time. */
let syncDirty = false;
let pendingOrgId: string | null = null;
let retryAttempt = 0;
let syncSendGeneration = 0;
let unsubscribeStore: (() => void) | null = null;
let onlineHandlerInstalled = false;

function clearDebounce(): void {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export function setHrCatalogSyncPaused(paused: boolean): void {
  syncPaused = paused;
  if (paused) {
    clearDebounce();
  }
}

export function isHrCatalogSyncPaused(): boolean {
  return syncPaused;
}

function scheduleDebounce(): void {
  if (syncPaused || !shouldSyncToServer()) return;
  clearDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushHrCatalogSync();
  }, DEBOUNCE_MS);
}

function markHrCatalogSyncDirty(orgId: string): void {
  pendingOrgId = orgId;
  syncDirty = true;
}

function handlePutResult(orgId: string, result: PutHrCatalogResult): boolean {
  if (result.kind === "ok") {
    if (getActiveOrganizationId() !== orgId) return false;
    writeHrCatalogLocalPersistSnapshot(orgId, result.meta.updatedAt);
    const localMeta = readHrCatalogLocalMeta(orgId);
    setHrCatalogSyncSynced({
      updatedAt: result.meta.updatedAt,
      localSavedAt: localMeta?.localSavedAt ?? result.meta.updatedAt,
    });
    clearHrCatalogPendingServerUplift(orgId);
    retryAttempt = 0;
    return true;
  }

  if (result.kind === "conflict") {
    setHrCatalogSyncError(result.message);
    retryAttempt = 0;
    return false;
  }

  if (result.kind === "validation") {
    setHrCatalogSyncError(result.message);
    retryAttempt = 0;
    return false;
  }

  setHrCatalogSyncError(result.message);
  return result.retryable;
}

async function sendCatalog(
  orgId: string,
  options?: { keepalive?: boolean; skipExpectedUpdatedAt?: boolean }
): Promise<boolean> {
  if (getActiveOrganizationId() !== orgId) return false;

  const sendGen = ++syncSendGeneration;

  setHrCatalogSyncPending();
  const expected =
    options?.skipExpectedUpdatedAt === true
      ? undefined
      : (getHrCatalogSyncState().lastKnownServerUpdatedAt ?? undefined);

  let catalog = partializeHrCatalogFromState(useHrWorkforceStore.getState());

  let result = await putHrCatalog({
    catalog,
    expectedUpdatedAt: expected,
    keepalive: options?.keepalive,
  });

  if (sendGen !== syncSendGeneration) {
    return false;
  }

  if (result.kind === "conflict") {
    const refetched = await fetchHrCatalog();
    if (refetched.kind === "ok" && sendGen === syncSendGeneration) {
      setLastKnownServerUpdatedAt(refetched.meta.updatedAt);
      catalog = partializeHrCatalogFromState(useHrWorkforceStore.getState());
      result = await putHrCatalog({
        catalog,
        expectedUpdatedAt: refetched.meta.updatedAt,
        keepalive: options?.keepalive,
      });
    }
  }

  if (sendGen !== syncSendGeneration) {
    return false;
  }

  if (result.kind === "ok") {
    setLastSyncedCatalogFingerprint(fingerprintHrCatalog(catalog));
  }

  return handlePutResult(orgId, result);
}

async function runFlushLoop(
  options?: { keepalive?: boolean; skipExpectedUpdatedAt?: boolean }
): Promise<void> {
  clearDebounce();

  const orgId = pendingOrgId ?? getActiveOrganizationId();
  if (!orgId) return;

  while (syncDirty && pendingOrgId) {
    const currentOrg = pendingOrgId;
    syncDirty = false;

    const ok = await sendCatalog(currentOrg, options);

    if (!ok && retryAttempt < RETRY_DELAYS_MS.length) {
      const delay = RETRY_DELAYS_MS[retryAttempt]!;
      retryAttempt += 1;
      syncDirty = true;
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    if (ok) retryAttempt = 0;
  }
}

export async function flushHrCatalogSync(
  organizationId?: string,
  options?: { keepalive?: boolean; skipExpectedUpdatedAt?: boolean }
): Promise<void> {
  if (!shouldSyncToServer()) return;

  const orgId = organizationId ?? getActiveOrganizationId();
  if (!orgId) return;

  markHrCatalogSyncDirty(orgId);

  const task = flushChain.then(() => runFlushLoop(options));
  flushChain = task.catch(() => {});
  await task;
}

function onStoreChange(): void {
  if (syncPaused || !shouldSyncToServer()) return;
  const orgId = getActiveOrganizationId();
  if (!orgId) return;

  markHrCatalogSyncDirty(orgId);
  scheduleDebounce();
}

function installOnlineRetry(): void {
  if (onlineHandlerInstalled || typeof window === "undefined") return;
  onlineHandlerInstalled = true;
  window.addEventListener("online", () => {
    if (getHrCatalogSyncState().syncStatus === "error") {
      void flushHrCatalogSync();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && getHrCatalogSyncState().syncStatus === "error") {
      void flushHrCatalogSync();
    }
  });
}

export function installHrCatalogDualWrite(): () => void {
  if (typeof window === "undefined") return () => {};

  installOnlineRetry();

  if (unsubscribeStore) {
    return unsubscribeStore;
  }

  let lastJson = "";

  unsubscribeStore = useHrWorkforceStore.subscribe((state) => {
    const catalog = partializeHrCatalogFromState(state);
    const json = JSON.stringify(catalog);
    if (json === lastJson) return;
    lastJson = json;
    onStoreChange();
  });

  return () => {
    unsubscribeStore?.();
    unsubscribeStore = null;
    clearDebounce();
  };
}

export function uninstallHrCatalogDualWrite(): void {
  unsubscribeStore?.();
  unsubscribeStore = null;
  clearDebounce();
  syncDirty = false;
  pendingOrgId = null;
}

/** Call after server-wins hydrate to seed optimistic lock baseline. */
export function seedHrCatalogServerUpdatedAt(updatedAt: string): void {
  setLastKnownServerUpdatedAt(updatedAt);
  setHrCatalogSyncSynced({ updatedAt });
  const catalog = partializeHrCatalogFromState(useHrWorkforceStore.getState());
  setLastSyncedCatalogFingerprint(fingerprintHrCatalog(catalog));
}
