import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import { getHrCatalogSyncState } from "@/lib/persistence/hr-catalog-sync-state";
import { markHrCatalogPendingServerUplift } from "@/lib/persistence/hr-catalog-uplift";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { requestHrPlanningSyncNow } from "@/lib/platform-economics/request-hr-planning-sync";
import type { HrBusinessUnit } from "@/types/hr-workforce";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

export type AddBusinessUnitFlowResult = {
  bu: HrBusinessUnit;
  ok: boolean;
  error?: string;
  companyId?: string;
};

/** Flush HR catalog, sync planning companies, return linked planning company id if any. */
export async function persistNewBusinessUnitAndSync(
  bu: HrBusinessUnit
): Promise<AddBusinessUnitFlowResult> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    return { bu, ok: true };
  }

  markHrCatalogPendingServerUplift(orgId);

  if (shouldSyncToServer()) {
    try {
      await flushHrCatalogSync(orgId, { skipExpectedUpdatedAt: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { bu, ok: false, error: message };
    }

    const flushState = getHrCatalogSyncState();
    if (flushState.syncStatus === "error" && flushState.lastError) {
      return { bu, ok: false, error: flushState.lastError };
    }
  }

  const bootstrap = await requestHrPlanningSyncNow();
  if (bootstrap && bootstrap.errors.length > 0 && !bootstrap.sync?.ok) {
    return {
      bu,
      ok: false,
      error: bootstrap.errors.join("; "),
    };
  }

  const companyId = useWorkspaceStore
    .getState()
    .companies.find((c) => c.hrBusinessUnitId === bu.id)?.id;

  return { bu, ok: true, companyId };
}
