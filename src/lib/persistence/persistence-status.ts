import {
  getPersistMode,
  isSupabaseConfigured,
  isTenantNamespacedPersistEnabled,
  shouldHydrateHrCatalogFromServer,
  shouldHydrateServiceCatalogFromServer,
  shouldHydrateWorkspaceFromServer,
  type PersistMode,
} from "@/lib/persistence/persist-mode";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";

export type IncentivePersistenceBackend = "supabase" | "memory" | "unavailable";

export type PersistenceStatusSnapshot = {
  persistMode: PersistMode;
  supabaseConfigured: boolean;
  tenantNamespaced: boolean;
  incentiveFallbackAllowed: boolean;
  hydration: {
    hrFromServer: boolean;
    serviceFromServer: boolean;
    workspaceFromServer: boolean;
  };
  /** Client-side hint; server resolves actual backend at request time. */
  incentiveBackendHint: IncentivePersistenceBackend;
};

function isIncentiveMemoryFallbackAllowed(): boolean {
  const raw = process.env.INCENTIVE_ALLOW_MEMORY_FALLBACK?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/** Shared snapshot for dev UI and API (static fields only). */
export function buildPersistenceStatusSnapshot(): PersistenceStatusSnapshot {
  const supabaseConfigured = isSupabaseConfigured();
  const incentiveFallbackAllowed = isIncentiveMemoryFallbackAllowed();

  let incentiveBackendHint: IncentivePersistenceBackend = "unavailable";
  if (supabaseConfigured) {
    incentiveBackendHint = "supabase";
  } else if (incentiveFallbackAllowed) {
    incentiveBackendHint = "memory";
  }

  return {
    persistMode: getPersistMode(),
    supabaseConfigured,
    tenantNamespaced: isTenantNamespacedPersistEnabled(),
    incentiveFallbackAllowed,
    hydration: {
      hrFromServer: shouldHydrateHrCatalogFromServer(),
      serviceFromServer: shouldHydrateServiceCatalogFromServer(),
      workspaceFromServer: shouldHydrateWorkspaceFromServer(),
    },
    incentiveBackendHint,
  };
}

export function isPersistenceBannerEnabled(): boolean {
  return isQaInstrumentationEnabled();
}

export { isIncentiveMemoryFallbackAllowed };
