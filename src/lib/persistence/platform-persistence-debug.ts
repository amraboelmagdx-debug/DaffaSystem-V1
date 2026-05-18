import type { PersistenceStatusSnapshot } from "@/lib/persistence/persistence-status";
import { buildPersistenceStatusSnapshot } from "@/lib/persistence/persistence-status";
import { getHrHydrationDebugSnapshot } from "@/lib/persistence/hr-hydration-debug";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";
import type { OperationalWorkspaceBootstrapResult } from "@/lib/platform-economics/bootstrap-operational-workspace";

export type ScenarioPersistErrorSnapshot = {
  message: string;
  status?: number;
  scenarioId?: string;
  at: string;
} | null;

export type EfpPlatformDebug = {
  persistence: PersistenceStatusSnapshot;
  hrHydration: ReturnType<typeof getHrHydrationDebugSnapshot>;
  workspaceBootstrap: OperationalWorkspaceBootstrapResult | null;
  hydrationOrder: string[];
  lastScenarioPersistError: ScenarioPersistErrorSnapshot;
  updatedAt: string;
};

function emptyPlatformState(): EfpPlatformDebug {
  return {
    persistence: buildPersistenceStatusSnapshot(),
    hrHydration: null,
    workspaceBootstrap: null,
    hydrationOrder: [],
    lastScenarioPersistError: null,
    updatedAt: new Date().toISOString(),
  };
}

let platformState: EfpPlatformDebug | null = null;

function getPlatformState(): EfpPlatformDebug {
  if (!platformState) platformState = emptyPlatformState();
  return platformState;
}

export function isPlatformDebugEnabled(): boolean {
  return isQaInstrumentationEnabled();
}

export function recordScenarioPersistError(
  error: Omit<NonNullable<ScenarioPersistErrorSnapshot>, "at"> | null
): void {
  if (!isPlatformDebugEnabled()) return;
  const state = getPlatformState();
  platformState = {
    ...state,
    lastScenarioPersistError: error
      ? { ...error, at: new Date().toISOString() }
      : null,
    updatedAt: new Date().toISOString(),
  };
  syncWindow();
}

function syncWindow(): void {
  if (!isPlatformDebugEnabled() || typeof window === "undefined") return;
  const state = getPlatformState();
  window.__EFP_PLATFORM_DEBUG = {
    ...state,
    getSnapshot: (): EfpPlatformDebug => {
      const snap = getPlatformState();
      return {
        ...snap,
        persistence: buildPersistenceStatusSnapshot(),
        hrHydration: getHrHydrationDebugSnapshot(),
      };
    },
  };
}

export function patchPlatformDebug(
  patch: Partial<
    Pick<EfpPlatformDebug, "workspaceBootstrap" | "hydrationOrder">
  >
): void {
  if (!isPlatformDebugEnabled()) return;
  const state = getPlatformState();
  platformState = {
    ...state,
    ...patch,
    persistence: buildPersistenceStatusSnapshot(),
    hrHydration: getHrHydrationDebugSnapshot(),
    updatedAt: new Date().toISOString(),
  };
  syncWindow();
}

export function recordHydrationStep(step: string): void {
  if (!isPlatformDebugEnabled()) return;
  const state = getPlatformState();
  platformState = {
    ...state,
    hydrationOrder: [...state.hydrationOrder, step].slice(-30),
    persistence: buildPersistenceStatusSnapshot(),
    updatedAt: new Date().toISOString(),
  };
  syncWindow();
}

export function installPlatformDebugGlobal(): void {
  if (!isPlatformDebugEnabled() || typeof window === "undefined") return;
  const state = getPlatformState();
  platformState = {
    ...state,
    persistence: buildPersistenceStatusSnapshot(),
    hrHydration: getHrHydrationDebugSnapshot(),
  };
  syncWindow();
}

export function getPlatformDebugSnapshot(): EfpPlatformDebug | null {
  if (!isPlatformDebugEnabled()) return null;
  const state = getPlatformState();
  return {
    ...state,
    persistence: buildPersistenceStatusSnapshot(),
    hrHydration: getHrHydrationDebugSnapshot(),
  };
}
