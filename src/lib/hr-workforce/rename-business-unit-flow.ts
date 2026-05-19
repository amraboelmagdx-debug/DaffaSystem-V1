import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import { getHrCatalogSyncState } from "@/lib/persistence/hr-catalog-sync-state";
import { markHrCatalogPendingServerUplift } from "@/lib/persistence/hr-catalog-uplift";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { requestHrPlanningSyncNow } from "@/lib/platform-economics/request-hr-planning-sync";
import { mirrorBuNameToLinkedCompany } from "@/lib/hr-workforce/mirror-bu-name-to-company";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

export type RenameBusinessUnitInput = {
  hrBusinessUnitId: string;
  name: string;
  code?: string;
};

export type RenameBusinessUnitFlowResult = {
  ok: boolean;
  error?: string;
  errorCode?: "name_required";
  companyId?: string | null;
};

/** Rename HR business unit, mirror to planning company, flush catalog, sync workspace. */
export async function persistRenameBusinessUnitAndSync(
  input: RenameBusinessUnitInput
): Promise<RenameBusinessUnitFlowResult> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return { ok: false, errorCode: "name_required" };
  }

  const code = input.code?.trim() ?? "";
  useHrWorkforceStore.getState().updateBusinessUnit(input.hrBusinessUnitId, {
    name: trimmedName,
    code,
  });

  const companyId = mirrorBuNameToLinkedCompany(
    input.hrBusinessUnitId,
    trimmedName
  );

  const orgId = getActiveOrganizationId();
  if (!orgId) {
    return { ok: true, companyId };
  }

  markHrCatalogPendingServerUplift(orgId);

  if (shouldSyncToServer()) {
    try {
      await flushHrCatalogSync(orgId, { skipExpectedUpdatedAt: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message, companyId };
    }

    const flushState = getHrCatalogSyncState();
    if (flushState.syncStatus === "error" && flushState.lastError) {
      return { ok: false, error: flushState.lastError, companyId };
    }
  }

  const bootstrap = await requestHrPlanningSyncNow();
  if (bootstrap && bootstrap.errors.length > 0 && !bootstrap.sync?.ok) {
    return {
      ok: false,
      error: bootstrap.errors.join("; "),
      companyId,
    };
  }

  return { ok: true, companyId };
}
