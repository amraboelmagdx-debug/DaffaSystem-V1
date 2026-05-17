import { fetchHrCatalog } from "@/lib/persistence/fetch-hr-catalog";
import { writeHrCatalogLocalPersistSnapshot } from "@/lib/persistence/hr-catalog-local-persist";
import {
  hrHydrationDebugLog,
  patchHrHydrationDebug,
  recordHrHydrationDebugError,
  resetHrHydrationDebugForOrg,
  type HrHydrationDebugSource,
} from "@/lib/persistence/hr-hydration-debug";
import {
  parseLocalSavedAtMs,
  readHrCatalogLocalMeta,
} from "@/lib/persistence/hr-catalog-local-meta";
import {
  clearHrCatalogPendingServerUplift,
  isHrCatalogPendingServerUplift,
  markHrCatalogPendingServerUplift,
} from "@/lib/persistence/hr-catalog-uplift";
import { shouldHydrateHrCatalogFromServer } from "@/lib/persistence/persist-mode";
import {
  mergeHrPersistedCatalogIntoState,
  useHrWorkforceStore,
} from "@/stores/use-hr-workforce-store";
import type { HrWorkforceState } from "@/stores/hr-workforce/hr-workforce-store-types";

export type HrHydrationStatus = "idle" | "loading" | "success" | "error" | "skipped";
export type HrHydrationSource = "local" | "server" | "none";

export type HrHydrationResult = {
  status: HrHydrationStatus;
  source: HrHydrationSource;
  errorMessage?: string;
  serverUpdatedAt?: string;
  localSavedAt?: string;
  pendingUplift: boolean;
};

const IDLE_RESULT: HrHydrationResult = {
  status: "idle",
  source: "none",
  pendingUplift: false,
};

function catalogPayloadFromRecord(catalog: Record<string, unknown>): Partial<HrWorkforceState> {
  const patch: Partial<HrWorkforceState> = {};
  const keys: (keyof HrWorkforceState)[] = [
    "businessUnits",
    "departments",
    "teams",
    "roles",
    "hrGlobalSettings",
    "ohManualByBusinessUnitId",
    "importLogs",
    "snapshots",
  ];
  for (const key of keys) {
    if (key in catalog) {
      (patch as Record<string, unknown>)[key] = catalog[key];
    }
  }
  return patch;
}

export function hasMeaningfulLocalHrCatalog(state: {
  businessUnits: unknown[];
  roles: unknown[];
}): boolean {
  return state.businessUnits.length > 0 || state.roles.length > 0;
}

function parseServerUpdatedAtMs(updatedAt: string): number {
  const ms = Date.parse(updatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

function finalizeHrHydrationDebug(
  organizationId: string,
  debugSource: HrHydrationDebugSource,
  fields: {
    lastDecision: string;
    lastServerHydrationAt?: string | null;
    lastLocalHydrationAt?: string | null;
    pendingUplift?: boolean;
    localSavedAt?: string;
    serverUpdatedAt?: string;
    status: HrHydrationStatus;
  }
): void {
  patchHrHydrationDebug({
    organizationId,
    source: debugSource,
    lastDecision: fields.lastDecision,
    lastServerHydrationAt: fields.lastServerHydrationAt ?? null,
    lastLocalHydrationAt: fields.lastLocalHydrationAt ?? fields.localSavedAt ?? null,
    pendingUplift: fields.pendingUplift ?? isHrCatalogPendingServerUplift(organizationId),
  });
  hrHydrationDebugLog("hydration complete", {
    organizationId,
    debugSource,
    status: fields.status,
    lastDecision: fields.lastDecision,
    serverUpdatedAt: fields.serverUpdatedAt,
    localSavedAt: fields.localSavedAt,
    pendingUplift: fields.pendingUplift ?? isHrCatalogPendingServerUplift(organizationId),
  });
}

/**
 * Server HR catalog hydration with timestamp precedence (Phase 2.1).
 * Call after namespaced local rehydrate. Never performs PUT.
 */
export async function hydrateHrCatalogFromServer(
  organizationId: string
): Promise<HrHydrationResult> {
  resetHrHydrationDebugForOrg(organizationId);

  const localMeta = readHrCatalogLocalMeta(organizationId);
  const localSavedAt = localMeta?.localSavedAt;
  const localSavedAtMs = parseLocalSavedAtMs(organizationId);

  patchHrHydrationDebug({
    lastLocalHydrationAt: localSavedAt ?? null,
  });

  hrHydrationDebugLog("hydrate start", {
    organizationId,
    localSavedAt,
    localSavedAtMs,
    serverHydrateEnabled: shouldHydrateHrCatalogFromServer(),
  });

  if (!shouldHydrateHrCatalogFromServer()) {
    const result: HrHydrationResult = {
      status: "skipped",
      source: "local",
      localSavedAt,
      pendingUplift: isHrCatalogPendingServerUplift(organizationId),
    };
    finalizeHrHydrationDebug(organizationId, "local", {
      lastDecision: "skipped_server_hydrate_flag",
      lastLocalHydrationAt: localSavedAt ?? null,
      pendingUplift: result.pendingUplift,
      localSavedAt,
      status: result.status,
    });
    return result;
  }

  hrHydrationDebugLog("server fetch", { organizationId, url: "/api/org/hr-catalog" });
  const fetchResult = await fetchHrCatalog();
  hrHydrationDebugLog("server fetch result", {
    organizationId,
    kind: fetchResult.kind,
    ...(fetchResult.kind === "error"
      ? { status: fetchResult.status, message: fetchResult.message }
      : {}),
    ...(fetchResult.kind === "ok" ? { serverUpdatedAt: fetchResult.meta.updatedAt } : {}),
  });

  const localState = useHrWorkforceStore.getState();
  const localHasData = hasMeaningfulLocalHrCatalog(localState);

  if (fetchResult.kind === "error") {
    recordHrHydrationDebugError(fetchResult.message);
    const result: HrHydrationResult = {
      status: "error",
      source: "local",
      errorMessage: fetchResult.message,
      localSavedAt,
      pendingUplift: isHrCatalogPendingServerUplift(organizationId),
    };
    hrHydrationDebugLog("local fallback", {
      organizationId,
      reason: "fetch_error",
      message: fetchResult.message,
    });
    finalizeHrHydrationDebug(organizationId, "fallback", {
      lastDecision: "fetch_error_keep_local",
      lastLocalHydrationAt: localSavedAt ?? null,
      pendingUplift: result.pendingUplift,
      localSavedAt,
      status: result.status,
    });
    return result;
  }

  if (fetchResult.kind === "not_found") {
    if (localHasData) {
      markHrCatalogPendingServerUplift(organizationId);
    }
    const debugSource: HrHydrationDebugSource = localHasData ? "local" : "empty";
    const result: HrHydrationResult = {
      status: "success",
      source: "local",
      localSavedAt,
      pendingUplift: isHrCatalogPendingServerUplift(organizationId),
    };
    hrHydrationDebugLog("local fallback", {
      organizationId,
      reason: "server_404",
      localHasData,
    });
    finalizeHrHydrationDebug(organizationId, debugSource, {
      lastDecision: localHasData ? "server_404_keep_local" : "server_404_empty_seed",
      lastLocalHydrationAt: localSavedAt ?? null,
      pendingUplift: result.pendingUplift,
      localSavedAt,
      status: result.status,
    });
    return result;
  }

  const serverMs = parseServerUpdatedAtMs(fetchResult.meta.updatedAt);
  const serverUpdatedAt = fetchResult.meta.updatedAt;

  const pendingUplift = isHrCatalogPendingServerUplift(organizationId);
  const serverWins =
    serverMs >= localSavedAtMs || (localSavedAtMs > serverMs && !pendingUplift);

  hrHydrationDebugLog("server precedence decision", {
    organizationId,
    serverUpdatedAt,
    serverMs,
    localSavedAt,
    localSavedAtMs,
    pendingUplift,
    serverWins,
    localHasData,
  });

  if (serverWins) {
    mergeHrPersistedCatalogIntoState(catalogPayloadFromRecord(fetchResult.catalog));
    writeHrCatalogLocalPersistSnapshot(organizationId, serverUpdatedAt);
    clearHrCatalogPendingServerUplift(organizationId);
    const result: HrHydrationResult = {
      status: "success",
      source: "server",
      serverUpdatedAt,
      localSavedAt,
      pendingUplift: false,
    };
    finalizeHrHydrationDebug(organizationId, "server", {
      lastDecision: "server_updated_at_gte_local",
      lastServerHydrationAt: serverUpdatedAt,
      lastLocalHydrationAt: localSavedAt ?? null,
      pendingUplift: false,
      localSavedAt,
      serverUpdatedAt,
      status: result.status,
    });
    return result;
  }

  if (localHasData) {
    markHrCatalogPendingServerUplift(organizationId);
  }

  const debugSource: HrHydrationDebugSource = localHasData ? "local" : "empty";
  const result: HrHydrationResult = {
    status: "success",
    source: "local",
    serverUpdatedAt,
    localSavedAt,
    pendingUplift: isHrCatalogPendingServerUplift(organizationId),
  };
  hrHydrationDebugLog("local fallback", {
    organizationId,
    reason: "local_newer_than_server",
    serverUpdatedAt,
    localSavedAt,
  });
  finalizeHrHydrationDebug(organizationId, debugSource, {
    lastDecision: "local_newer_than_server",
    lastServerHydrationAt: serverUpdatedAt,
    lastLocalHydrationAt: localSavedAt ?? null,
    pendingUplift: result.pendingUplift,
    localSavedAt,
    serverUpdatedAt,
    status: result.status,
  });
  return result;
}

export { IDLE_RESULT as HR_HYDRATION_IDLE };
