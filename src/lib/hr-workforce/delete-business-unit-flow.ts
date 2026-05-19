import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import { getHrCatalogSyncState } from "@/lib/persistence/hr-catalog-sync-state";
import { markHrCatalogPendingServerUplift } from "@/lib/persistence/hr-catalog-uplift";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { requestHrPlanningSyncNow } from "@/lib/platform-economics/request-hr-planning-sync";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

export type DeleteBusinessUnitFlowResult = {
  ok: boolean;
  error?: string;
  errorCode?: "cannot_delete_last";
};

/** Remove HR business unit, flush catalog, and sync planning workspace. */
export async function persistDeleteBusinessUnitAndSync(
  hrBusinessUnitId: string
): Promise<DeleteBusinessUnitFlowResult> {
  const hrState = useHrWorkforceStore.getState();
  if (hrState.businessUnits.length <= 1) {
    return { ok: false, errorCode: "cannot_delete_last" };
  }

  const workspaceBefore = useWorkspaceStore.getState();
  const deletedCompanyId = workspaceBefore.companies.find(
    (c) => c.hrBusinessUnitId === hrBusinessUnitId
  )?.id;
  const wasSelected =
    deletedCompanyId != null &&
    workspaceBefore.selectedCompanyId === deletedCompanyId;

  useHrWorkforceStore.getState().deleteBusinessUnit(hrBusinessUnitId);

  const orgId = getActiveOrganizationId();
  if (!orgId) {
    if (wasSelected) {
      reselectOperationalCompany(deletedCompanyId);
    }
    return { ok: true };
  }

  markHrCatalogPendingServerUplift(orgId);

  if (shouldSyncToServer()) {
    try {
      await flushHrCatalogSync(orgId, { skipExpectedUpdatedAt: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }

    const flushState = getHrCatalogSyncState();
    if (flushState.syncStatus === "error" && flushState.lastError) {
      return { ok: false, error: flushState.lastError };
    }
  }

  const bootstrap = await requestHrPlanningSyncNow();
  if (bootstrap && bootstrap.errors.length > 0 && !bootstrap.sync?.ok) {
    return {
      ok: false,
      error: bootstrap.errors.join("; "),
    };
  }

  if (wasSelected) {
    reselectOperationalCompany(deletedCompanyId);
  }

  return { ok: true };
}

function reselectOperationalCompany(excludedCompanyId?: string) {
  const { companies, selectedCompanyId, setCompany, clearOperationalContext } =
    useWorkspaceStore.getState();
  const selectionStillExists =
    selectedCompanyId != null &&
    companies.some((c) => c.id === selectedCompanyId);
  if (selectionStillExists && selectedCompanyId !== excludedCompanyId) {
    return;
  }
  const next =
    companies.find((c) => c.id !== excludedCompanyId) ?? companies[0];
  if (next) {
    setCompany(next.id);
  } else {
    clearOperationalContext();
  }
}
