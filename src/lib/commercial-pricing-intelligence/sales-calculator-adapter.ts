import type {
  CommercialPricingIntelligenceSuccess,
  CommercialPricingSnapshot,
} from "./types";
import type { ServiceCatalogSelection } from "@/lib/service-architecture/sales-plan-bridge";

export function toCommercialPricingSnapshot(
  selection: ServiceCatalogSelection,
  success: CommercialPricingIntelligenceSuccess
): CommercialPricingSnapshot {
  return {
    selection,
    computedAt: new Date().toISOString(),
    modelId: success.model.modelId,
    suggestedCommercialPrice: success.suggestedCommercialPrice,
    currency: success.basis.currency,
    margins: {
      grossMarginPct: success.margins.grossMarginPct,
      contributionMarginPct: success.margins.contributionMarginPct,
    },
    activeRiskIds: [...success.activeRiskIds],
    scenarioId: success.scenario.id,
  };
}
