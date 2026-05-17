import {
  bootstrapOperationalWorkspaceFromHr,
  refreshPlanningWorkspaceFromServer,
} from "@/lib/platform-economics/bootstrap-operational-workspace";
import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import type { EconomicsSyncResult } from "@/lib/platform-economics/types";

export type LinkRevenueStreamToServiceInput = {
  streamId: string;
  serviceTemplateId?: string | null;
  serviceFamilyId?: string | null;
};

/** @deprecated Prefer `bootstrapOperationalWorkspaceFromHr` — kept for stream service-link. */
export { refreshPlanningWorkspaceFromServer };

export async function syncEconomicsGraphFromHr(): Promise<EconomicsSyncResult> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    return {
      ok: false,
      organizationId: "",
      companiesUpserted: 0,
      linksUpserted: 0,
      streamsCreated: 0,
      streamsUpdated: 0,
      scenariosCreated: 0,
      companiesRetired: 0,
      errors: ["No active organization"],
    };
  }
  const result = await bootstrapOperationalWorkspaceFromHr(orgId);
  return (
    result.sync ?? {
      ok: false,
      organizationId: orgId,
      companiesUpserted: 0,
      linksUpserted: 0,
      streamsCreated: 0,
      streamsUpdated: 0,
      scenariosCreated: 0,
      companiesRetired: 0,
      errors: result.errors,
    }
  );
}

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
