/**
 * Development-only HR hydration observability (Phase 2.1).
 * Stripped from production bundles via NODE_ENV checks — no persistence behavior changes.
 */

export type HrHydrationDebugSource = "server" | "local" | "fallback" | "empty";

export type EfpHrHydrationDebug = {
  organizationId: string | null;
  /** Resolved catalog authority for the last hydrate pass. */
  source: HrHydrationDebugSource;
  lastServerHydrationAt: string | null;
  lastLocalHydrationAt: string | null;
  pendingUplift: boolean;
  hydrationErrors: string[];
  /** ISO timestamp when this snapshot was last updated. */
  updatedAt: string;
  /** Last precedence / branch label (dev troubleshooting). */
  lastDecision: string | null;
  /** Persist resolver diagnostics (why legacy vs namespaced key). */
  persist: {
    namespacedPersistEnabled: boolean;
    activeOrganizationId: string | null;
    lastResolvedHrPersistKey: string | null;
    usingLegacyFallback: boolean;
  };
};

const MAX_ERRORS = 20;

function emptyDebugState(): EfpHrHydrationDebug {
  return {
    organizationId: null,
    source: "empty",
    lastServerHydrationAt: null,
    lastLocalHydrationAt: null,
    pendingUplift: false,
    hydrationErrors: [],
    updatedAt: new Date().toISOString(),
    lastDecision: null,
    persist: {
      namespacedPersistEnabled: true,
      activeOrganizationId: null,
      lastResolvedHrPersistKey: null,
      usingLegacyFallback: true,
    },
  };
}

let debugState: EfpHrHydrationDebug = emptyDebugState();

export function isHrHydrationDebugEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

function syncWindowDebug(): void {
  if (!isHrHydrationDebugEnabled() || typeof window === "undefined") return;
  window.__EFP_HR_HYDRATION_DEBUG = {
    ...debugState,
    getSnapshot: () => ({ ...debugState }),
  };
}

export function getHrHydrationDebugSnapshot(): EfpHrHydrationDebug | null {
  if (!isHrHydrationDebugEnabled()) return null;
  return { ...debugState };
}

export function patchHrHydrationDebug(patch: Partial<EfpHrHydrationDebug>): void {
  if (!isHrHydrationDebugEnabled()) return;
  debugState = {
    ...debugState,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  syncWindowDebug();
}

export function resetHrHydrationDebugForOrg(organizationId: string): void {
  if (!isHrHydrationDebugEnabled()) return;
  const next = emptyDebugState();
  debugState = {
    ...next,
    organizationId,
    hydrationErrors: [],
    persist: { ...next.persist, activeOrganizationId: organizationId },
  };
  syncWindowDebug();
}

export function recordHrHydrationDebugError(message: string): void {
  if (!isHrHydrationDebugEnabled()) return;
  debugState = {
    ...debugState,
    hydrationErrors: [...debugState.hydrationErrors, message].slice(-MAX_ERRORS),
    updatedAt: new Date().toISOString(),
  };
  syncWindowDebug();
}

export function hrHydrationDebugLog(
  event: string,
  detail?: Record<string, unknown>
): void {
  if (!isHrHydrationDebugEnabled()) return;
  if (detail !== undefined) {
    console.debug(`[EFP HR Hydrate] ${event}`, detail);
  } else {
    console.debug(`[EFP HR Hydrate] ${event}`);
  }
}

export function recordHrPersistKeyResolution(fields: {
  namespacedPersistEnabled: boolean;
  activeOrganizationId: string | null;
  lastResolvedHrPersistKey: string;
  usingLegacyFallback: boolean;
}): void {
  if (!isHrHydrationDebugEnabled()) return;
  debugState = {
    ...debugState,
    persist: { ...fields },
    updatedAt: new Date().toISOString(),
  };
  syncWindowDebug();
  if (fields.usingLegacyFallback) {
    hrHydrationDebugLog("persist legacy fallback", fields);
  }
}

/** Call once on client when dashboard persistence provider mounts (dev only). */
export function installHrHydrationDebugGlobal(): void {
  if (!isHrHydrationDebugEnabled() || typeof window === "undefined") return;
  syncWindowDebug();
}
