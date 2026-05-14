import type { ServiceCatalogSelection } from "@/lib/service-architecture/sales-plan-bridge";
import type { ServiceCostBaselineSnapshot, ServiceCostSimulationSuccess } from "./types";

/**
 * Adapter for future Sales Plan: stable template + tier ids with optional simulated baseline totals.
 * Keeps Sales Plan decoupled from HR/service stores — callers pass already-computed success.
 */
export function toServiceCostBaselineSnapshot(
  selection: ServiceCatalogSelection,
  success: ServiceCostSimulationSuccess
): ServiceCostBaselineSnapshot {
  return {
    selection,
    computedAt: new Date().toISOString(),
    totals: {
      totalLoadedCost: success.totals.totalLoadedCost,
      totalEffectiveHours: success.totals.totalEffectiveHours,
      totalOhContribution: success.totals.totalOhContribution,
    },
    templateCode: success.templateCode,
    tierCode: success.tierCode,
  };
}
