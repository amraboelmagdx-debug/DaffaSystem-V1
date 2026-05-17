import { fetchServiceCatalog } from "@/lib/persistence/fetch-service-catalog";
import { writeServiceCatalogLocalPersistSnapshot } from "@/lib/persistence/service-catalog-local-persist";
import {
  parseServiceCatalogLocalSavedAtMs,
  readServiceCatalogLocalMeta,
} from "@/lib/persistence/service-catalog-local-meta";
import {
  clearServiceCatalogPendingServerUplift,
  isServiceCatalogPendingServerUplift,
  markServiceCatalogPendingServerUplift,
} from "@/lib/persistence/service-catalog-uplift";
import { shouldHydrateServiceCatalogFromServer } from "@/lib/persistence/persist-mode";
import {
  mergeServiceArchitectureCatalogIntoState,
  useServiceArchitectureStore,
  type ServiceArchitectureCatalogState,
} from "@/stores/use-service-architecture-store";

export type ServiceHydrationStatus = "idle" | "loading" | "success" | "error" | "skipped";
export type ServiceHydrationSource = "local" | "server" | "none";

export type ServiceHydrationResult = {
  status: ServiceHydrationStatus;
  source: ServiceHydrationSource;
  errorMessage?: string;
  serverUpdatedAt?: string;
  localSavedAt?: string;
  pendingUplift: boolean;
};

export const SERVICE_HYDRATION_IDLE: ServiceHydrationResult = {
  status: "idle",
  source: "none",
  pendingUplift: false,
};

function catalogPayloadFromRecord(
  catalog: Record<string, unknown>
): Partial<ServiceArchitectureCatalogState> {
  const patch: Partial<ServiceArchitectureCatalogState> = {};
  const keys: (keyof ServiceArchitectureCatalogState)[] = [
    "serviceFamilies",
    "serviceTiers",
    "serviceTemplates",
    "serviceTemplateTiers",
    "deliveryPhases",
    "serviceTemplateTierPhases",
    "serviceDeliverables",
    "serviceRoleAllocations",
  ];
  for (const key of keys) {
    if (key in catalog) {
      (patch as Record<string, unknown>)[key] = catalog[key];
    }
  }
  return patch;
}

export function hasMeaningfulLocalServiceCatalog(state: {
  serviceFamilies: unknown[];
  serviceTemplates: unknown[];
}): boolean {
  return state.serviceFamilies.length > 0 || state.serviceTemplates.length > 0;
}

function parseServerUpdatedAtMs(updatedAt: string): number {
  const ms = Date.parse(updatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

export async function hydrateServiceCatalogFromServer(
  organizationId: string
): Promise<ServiceHydrationResult> {
  const localMeta = readServiceCatalogLocalMeta(organizationId);
  const localSavedAt = localMeta?.localSavedAt;
  const localSavedAtMs = parseServiceCatalogLocalSavedAtMs(organizationId);

  if (!shouldHydrateServiceCatalogFromServer()) {
    return {
      status: "skipped",
      source: "local",
      localSavedAt,
      pendingUplift: isServiceCatalogPendingServerUplift(organizationId),
    };
  }

  const fetchResult = await fetchServiceCatalog();
  const localState = useServiceArchitectureStore.getState();
  const localHasData = hasMeaningfulLocalServiceCatalog(localState);

  if (fetchResult.kind === "error") {
    return {
      status: "error",
      source: "local",
      errorMessage: fetchResult.message,
      localSavedAt,
      pendingUplift: isServiceCatalogPendingServerUplift(organizationId),
    };
  }

  if (fetchResult.kind === "not_found") {
    if (localHasData) {
      markServiceCatalogPendingServerUplift(organizationId);
    }
    return {
      status: "success",
      source: "local",
      localSavedAt,
      pendingUplift: isServiceCatalogPendingServerUplift(organizationId),
    };
  }

  const serverMs = parseServerUpdatedAtMs(fetchResult.meta.updatedAt);
  const serverUpdatedAt = fetchResult.meta.updatedAt;
  const pendingUplift = isServiceCatalogPendingServerUplift(organizationId);
  const serverWins =
    serverMs >= localSavedAtMs || (localSavedAtMs > serverMs && !pendingUplift);

  if (serverWins) {
    mergeServiceArchitectureCatalogIntoState(catalogPayloadFromRecord(fetchResult.catalog));
    writeServiceCatalogLocalPersistSnapshot(organizationId, serverUpdatedAt);
    clearServiceCatalogPendingServerUplift(organizationId);
    return {
      status: "success",
      source: "server",
      serverUpdatedAt,
      localSavedAt,
      pendingUplift: false,
    };
  }

  if (localHasData) {
    markServiceCatalogPendingServerUplift(organizationId);
  }

  return {
    status: "success",
    source: "local",
    serverUpdatedAt,
    localSavedAt,
    pendingUplift: isServiceCatalogPendingServerUplift(organizationId),
  };
}
