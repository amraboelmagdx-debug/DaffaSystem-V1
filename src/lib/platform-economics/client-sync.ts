import {
  applyPlanningClientModelToWorkspaceState,
  mapPlanningDtoToClientModel,
} from "@/lib/planning/workspace-from-server";
import type { PlanningWorkspaceDTO } from "@/server/planning/workspace";
import type { EconomicsSyncResult } from "@/lib/platform-economics/types";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

export async function syncEconomicsGraphFromHr(): Promise<EconomicsSyncResult> {
  const res = await fetch("/api/platform/economics/sync", {
    method: "POST",
    credentials: "include",
  });
  const body = (await res.json()) as EconomicsSyncResult;
  if (res.ok) {
    await refreshPlanningWorkspaceFromServer();
  }
  return body;
}

export async function refreshPlanningWorkspaceFromServer(): Promise<boolean> {
  const res = await fetch("/api/planning/workspace", { credentials: "include", cache: "no-store" });
  if (!res.ok) return false;
  const dto = (await res.json()) as PlanningWorkspaceDTO | { source: "none" };
  if (dto.source !== "supabase") return false;

  const model = mapPlanningDtoToClientModel(
    dto.organization?.id ?? "",
    dto,
    dto.company_hr_links ?? []
  );
  const next = applyPlanningClientModelToWorkspaceState(model);
  useWorkspaceStore.setState({
    companies: next.companies,
    streams: next.streams,
    scenarios: next.scenarios,
    opportunities: next.opportunities,
    selectedCompanyId: next.selectedCompanyId,
    selectedScenarioId: next.selectedScenarioId,
    tierLineOverrides: useWorkspaceStore.getState().tierLineOverrides,
  });
  return true;
}
