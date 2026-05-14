import type { ServiceCostSimulationSuccess } from "@/lib/service-cost-simulation/types";
import type { OperationalPricingBasis } from "./types";

/** Maps cost simulation output to commercial pricing inputs (strict separation: no commercial fields). */
export function operationalPricingBasisFromSimulation(
  success: ServiceCostSimulationSuccess,
  currency: string
): OperationalPricingBasis {
  return {
    businessUnitId: success.businessUnitId,
    serviceTemplateId: success.templateId,
    serviceTierId: success.tierId,
    templateCode: success.templateCode,
    tierCode: success.tierCode,
    templateName: success.templateName,
    tierName: success.tierName,
    currency: currency.length === 3 ? currency : "SAR",
    totalDirectCost: success.totals.totalDirectCost,
    totalLoadedCost: success.totals.totalLoadedCost,
    totalOhContribution: success.totals.totalOhContribution,
    totalEffectiveHours: success.totals.totalEffectiveHours,
  };
}
