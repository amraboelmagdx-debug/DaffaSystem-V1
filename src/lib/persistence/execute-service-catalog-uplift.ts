import { flushServiceCatalogSync } from "@/lib/persistence/service-catalog-dual-write";
import {
  clearServiceCatalogPendingServerUplift,
  isServiceCatalogPendingServerUplift,
} from "@/lib/persistence/service-catalog-uplift";
import { hasMeaningfulLocalServiceCatalog } from "@/lib/persistence/hydrate-service-catalog";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";

export type ServiceCatalogUpliftResult = {
  attempted: boolean;
  success: boolean;
  reason?: string;
};

export async function executeServiceCatalogPendingUplift(
  organizationId: string
): Promise<ServiceCatalogUpliftResult> {
  if (!shouldSyncToServer()) {
    return { attempted: false, success: false, reason: "local_only" };
  }

  const pending = isServiceCatalogPendingServerUplift(organizationId);
  const state = useServiceArchitectureStore.getState();
  const hasLocal = hasMeaningfulLocalServiceCatalog(state);

  if (!pending) {
    return { attempted: false, success: false, reason: "no_pending_uplift" };
  }

  if (!hasLocal) {
    clearServiceCatalogPendingServerUplift(organizationId);
    return { attempted: false, success: false, reason: "empty_catalog" };
  }

  await flushServiceCatalogSync(organizationId, { skipExpectedUpdatedAt: true });

  const stillPending = isServiceCatalogPendingServerUplift(organizationId);
  return {
    attempted: true,
    success: !stillPending,
    reason: stillPending ? "put_failed" : undefined,
  };
}
