import { runCommercialPricingIntelligence } from "@/lib/commercial-pricing-intelligence/engine";
import { MODEL_COMPARISON_DEFAULTS } from "@/lib/commercial-pricing-intelligence/model-comparison-defaults";
import type {
  CommercialMarginThresholds,
  CommercialPricingScenarioModifier,
  OperationalPricingBasis,
  PricingModelId,
  PricingModelSpec,
} from "@/lib/commercial-pricing-intelligence/types";

export type CommercialModelCompareRow = {
  id: PricingModelId;
  price: number;
  gross: number;
  contrib: number;
};

export function compareCommercialModels(input: {
  basis: OperationalPricingBasis;
  activeRiskIds: string[];
  scenario: CommercialPricingScenarioModifier;
  thresholds: CommercialMarginThresholds;
  models?: Partial<Record<PricingModelId, PricingModelSpec>>;
}): CommercialModelCompareRow[] {
  const modelIds = Object.keys(MODEL_COMPARISON_DEFAULTS) as PricingModelId[];
  return modelIds.map((id) => {
    const spec = input.models?.[id] ?? MODEL_COMPARISON_DEFAULTS[id];
    const r = runCommercialPricingIntelligence({
      basis: input.basis,
      model: spec,
      activeRiskIds: input.activeRiskIds,
      scenario: input.scenario,
      thresholds: input.thresholds,
    });
    if (!r.ok) return { id, price: 0, gross: 0, contrib: 0 };
    return {
      id,
      price: r.suggestedCommercialPrice,
      gross: r.margins.grossMarginPct,
      contrib: r.margins.contributionMarginPct,
    };
  });
}
