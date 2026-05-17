import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import {
  isHrCatalogPendingServerUplift,
  clearHrCatalogPendingServerUplift,
} from "@/lib/persistence/hr-catalog-uplift";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { hasMeaningfulLocalHrCatalog } from "@/lib/persistence/hydrate-hr-catalog";

export type HrCatalogUpliftResult = {
  attempted: boolean;
  success: boolean;
  reason?: string;
};

/**
 * Immediate PUT when local is ahead of server or server row is missing (Phase 2.2).
 */
export async function executeHrCatalogPendingUplift(
  organizationId: string
): Promise<HrCatalogUpliftResult> {
  if (!shouldSyncToServer()) {
    return { attempted: false, success: false, reason: "local_only" };
  }

  const pending = isHrCatalogPendingServerUplift(organizationId);
  const state = useHrWorkforceStore.getState();
  const hasLocal = hasMeaningfulLocalHrCatalog(state);

  if (!pending) {
    return { attempted: false, success: false, reason: "no_pending_uplift" };
  }

  if (!hasLocal) {
    clearHrCatalogPendingServerUplift(organizationId);
    return { attempted: false, success: false, reason: "empty_catalog" };
  }

  await flushHrCatalogSync(organizationId, { skipExpectedUpdatedAt: true });

  const stillPending = isHrCatalogPendingServerUplift(organizationId);
  return {
    attempted: true,
    success: !stillPending,
    reason: stillPending ? "put_failed" : undefined,
  };
}
