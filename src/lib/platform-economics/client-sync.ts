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

export type LinkRevenueStreamToServiceInput = {
  streamId: string;
  serviceTemplateId?: string | null;
  serviceFamilyId?: string | null;
};

/** Option A: explicit metadata link from a planning stream to SA catalog (no new streams). */
export async function linkRevenueStreamToService(
  input: LinkRevenueStreamToServiceInput
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(
    `/api/platform/planning/revenue-streams/${encodeURIComponent(input.streamId)}/service-link`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceTemplateId: input.serviceTemplateId,
        serviceFamilyId: input.serviceFamilyId,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : res.statusText;
    return { ok: false, message };
  }

  await refreshPlanningWorkspaceFromServer();
  return { ok: true };
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
