import { ensureHrCatalogOnServerForSync } from "@/lib/persistence/ensure-hr-for-planning-sync";
import { hrHydrationDebugLog } from "@/lib/persistence/hr-hydration-debug";
import { shouldHydrateWorkspaceFromServer } from "@/lib/persistence/persist-mode";
import {
  applyPlanningClientModelToWorkspaceState,
  buildScenarioBundlesFromServer,
  mapPlanningDtoToClientModel,
} from "@/lib/planning/workspace-from-server";
import { activeOperationalUnits } from "@/lib/platform-economics/operational-unit";
import {
  coerceErrorMessages,
  parsePlanningSyncResponse,
} from "@/lib/platform-economics/parse-planning-sync-response";
import type { EconomicsSyncResult } from "@/lib/platform-economics/types";
import type { PlanningWorkspaceDTO } from "@/server/planning/workspace";
import {
  rehydrateWorkspaceStore,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

import { useWorkspaceBootstrapStore } from "./workspace-bootstrap-state";

export type OperationalWorkspaceBootstrapResult = {
  uplift: { ok: boolean; attempted: boolean; error?: string };
  sync: EconomicsSyncResult | null;
  workspaceHydrated: boolean;
  linkedUnitCount: number;
  errors: string[];
  /** True when economics sync failed due to missing/invalid auth session. */
  authRequired?: boolean;
};

async function postPlanningSync(): Promise<{
  sync: EconomicsSyncResult;
  authRequired?: boolean;
}> {
  const res = await fetch("/api/platform/economics/sync", {
    method: "POST",
    credentials: "include",
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const parsed = parsePlanningSyncResponse(res, body);
  return {
    sync: parsed,
    authRequired: parsed.authRequired,
  };
}

export async function refreshPlanningWorkspaceFromServer(): Promise<boolean> {
  const res = await fetch("/api/planning/workspace", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return false;
  const dto = (await res.json()) as PlanningWorkspaceDTO | { source: "none" };
  if (dto.source !== "supabase") return false;

  const model = mapPlanningDtoToClientModel(
    dto.organization?.id ?? "",
    dto,
    dto.company_hr_links ?? []
  );
  const priorBundles = useWorkspaceStore.getState().scenarioBundles;
  const scenarioBundles = buildScenarioBundlesFromServer(
    dto,
    model.companies,
    model.scenarios,
    priorBundles,
    model.streams.map((s) => s.id)
  );
  const next = applyPlanningClientModelToWorkspaceState(model, { scenarioBundles });
  useWorkspaceStore.setState({
    companies: next.companies,
    streams: next.streams,
    scenarios: next.scenarios,
    scenarioBundles: next.scenarioBundles,
    opportunities: next.opportunities,
    selectedCompanyId: next.selectedCompanyId,
    selectedScenarioId: next.selectedScenarioId,
  });
  return true;
}

/**
 * Canonical HR → planning projection: uplift HR to server, sync companies/streams, hydrate workspace.
 */
export async function bootstrapOperationalWorkspaceFromHr(
  organizationId: string
): Promise<OperationalWorkspaceBootstrapResult> {
  const errors: string[] = [];
  useWorkspaceBootstrapStore.getState().setLoading();

  await rehydrateWorkspaceStore();

  const uplift = await ensureHrCatalogOnServerForSync(organizationId);
  if (!uplift.ok && uplift.error) errors.push(uplift.error);

  let sync: EconomicsSyncResult | null = null;
  let authRequired = false;
  const hasHrStructure = useHrWorkforceStore.getState().businessUnits.some((b) => b.isActive);
  if (hasHrStructure) {
    try {
      const syncResult = await postPlanningSync();
      sync = syncResult.sync;
      if (syncResult.authRequired) authRequired = true;
      if (!sync.ok) {
        errors.push(...coerceErrorMessages(sync.errors));
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  let workspaceHydrated = false;
  if (shouldHydrateWorkspaceFromServer()) {
    try {
      workspaceHydrated = await refreshPlanningWorkspaceFromServer();
      if (!workspaceHydrated) {
        errors.push("Planning workspace could not be loaded from server.");
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const linkedUnitCount = activeOperationalUnits(
    useWorkspaceStore.getState().companies
  ).length;

  const result: OperationalWorkspaceBootstrapResult = {
    uplift,
    sync,
    workspaceHydrated,
    linkedUnitCount,
    errors,
    authRequired: authRequired || undefined,
  };

  useWorkspaceBootstrapStore.getState().setResult(result);
  hrHydrationDebugLog("operational workspace bootstrap", {
    organizationId,
    linkedUnitCount,
    syncOk: sync?.ok,
    errors,
  });

  return result;
}
