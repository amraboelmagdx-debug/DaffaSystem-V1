import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { fetchServiceCatalog } from "@/lib/persistence/fetch-service-catalog";
import {
  fingerprintServiceCatalog,
  partializeServiceCatalogFromState,
} from "@/lib/persistence/service-catalog-payload";
import { writeServiceCatalogLocalPersistSnapshot } from "@/lib/persistence/service-catalog-local-persist";
import { readServiceCatalogLocalMeta } from "@/lib/persistence/service-catalog-local-meta";
import { clearServiceCatalogPendingServerUplift } from "@/lib/persistence/service-catalog-uplift";
import {
  getServiceCatalogSyncState,
  setLastSyncedServiceCatalogFingerprint,
  setServiceCatalogLastKnownServerUpdatedAt,
  setServiceCatalogSyncError,
  setServiceCatalogSyncPending,
  setServiceCatalogSyncSynced,
} from "@/lib/persistence/service-catalog-sync-state";
import { putServiceCatalog, type PutServiceCatalogResult } from "@/lib/persistence/put-service-catalog";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";

const DEBOUNCE_MS = 500;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

let syncPaused = true;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let flushChain: Promise<void> = Promise.resolve();
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

export function setServiceCatalogSyncPaused(paused: boolean): void {
  syncPaused = paused;
  if (paused) {
    clearDebounce();
  }
}

function scheduleDebounce(): void {
  if (syncPaused || !shouldSyncToServer()) return;
  clearDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushServiceCatalogSync();
  }, DEBOUNCE_MS);
}

function markServiceCatalogSyncDirty(orgId: string): void {
  pendingOrgId = orgId;
  syncDirty = true;
}

function handlePutResult(orgId: string, result: PutServiceCatalogResult): boolean {
  if (result.kind === "ok") {
    if (getActiveOrganizationId() !== orgId) return false;
    writeServiceCatalogLocalPersistSnapshot(orgId, result.meta.updatedAt);
    const localMeta = readServiceCatalogLocalMeta(orgId);
    setServiceCatalogSyncSynced({
      updatedAt: result.meta.updatedAt,
      localSavedAt: localMeta?.localSavedAt ?? result.meta.updatedAt,
    });
    clearServiceCatalogPendingServerUplift(orgId);
    retryAttempt = 0;
    return true;
  }

  if (result.kind === "conflict" || result.kind === "validation") {
    setServiceCatalogSyncError(result.message);
    retryAttempt = 0;
    return false;
  }

  setServiceCatalogSyncError(result.message);
  return result.retryable;
}

async function sendCatalog(
  orgId: string,
  options?: { keepalive?: boolean; skipExpectedUpdatedAt?: boolean }
): Promise<boolean> {
  if (getActiveOrganizationId() !== orgId) return false;

  const sendGen = ++syncSendGeneration;
  setServiceCatalogSyncPending();
  const expected =
    options?.skipExpectedUpdatedAt === true
      ? undefined
      : (getServiceCatalogSyncState().lastKnownServerUpdatedAt ?? undefined);

  let catalog = partializeServiceCatalogFromState(useServiceArchitectureStore.getState());

  let result = await putServiceCatalog({
    catalog,
    expectedUpdatedAt: expected,
    keepalive: options?.keepalive,
  });

  if (sendGen !== syncSendGeneration) return false;

  if (result.kind === "conflict") {
    const refetched = await fetchServiceCatalog();
    if (refetched.kind === "ok" && sendGen === syncSendGeneration) {
      setServiceCatalogLastKnownServerUpdatedAt(refetched.meta.updatedAt);
      catalog = partializeServiceCatalogFromState(useServiceArchitectureStore.getState());
      result = await putServiceCatalog({
        catalog,
        expectedUpdatedAt: refetched.meta.updatedAt,
        keepalive: options?.keepalive,
      });
    }
  }

  if (sendGen !== syncSendGeneration) return false;

  if (result.kind === "ok") {
    setLastSyncedServiceCatalogFingerprint(fingerprintServiceCatalog(catalog));
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

export async function flushServiceCatalogSync(
  organizationId?: string,
  options?: { keepalive?: boolean; skipExpectedUpdatedAt?: boolean }
): Promise<void> {
  if (!shouldSyncToServer()) return;
  const orgId = organizationId ?? getActiveOrganizationId();
  if (!orgId) return;

  markServiceCatalogSyncDirty(orgId);
  const task = flushChain.then(() => runFlushLoop(options));
  flushChain = task.catch(() => {});
  await task;
}

function onStoreChange(): void {
  if (syncPaused || !shouldSyncToServer()) return;
  const orgId = getActiveOrganizationId();
  if (!orgId) return;
  markServiceCatalogSyncDirty(orgId);
  scheduleDebounce();
}

function installOnlineRetry(): void {
  if (onlineHandlerInstalled || typeof window === "undefined") return;
  onlineHandlerInstalled = true;
  window.addEventListener("online", () => {
    if (getServiceCatalogSyncState().syncStatus === "error") {
      void flushServiceCatalogSync();
    }
  });
}

export function installServiceCatalogDualWrite(): () => void {
  if (typeof window === "undefined") return () => {};
  installOnlineRetry();
  if (unsubscribeStore) return unsubscribeStore;

  let lastJson = "";
  unsubscribeStore = useServiceArchitectureStore.subscribe((state) => {
    const catalog = partializeServiceCatalogFromState(state);
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

export function uninstallServiceCatalogDualWrite(): void {
  unsubscribeStore?.();
  unsubscribeStore = null;
  clearDebounce();
  syncDirty = false;
  pendingOrgId = null;
}

export function seedServiceCatalogServerUpdatedAt(updatedAt: string): void {
  setServiceCatalogLastKnownServerUpdatedAt(updatedAt);
  setServiceCatalogSyncSynced({ updatedAt });
  const catalog = partializeServiceCatalogFromState(useServiceArchitectureStore.getState());
  setLastSyncedServiceCatalogFingerprint(fingerprintServiceCatalog(catalog));
}
