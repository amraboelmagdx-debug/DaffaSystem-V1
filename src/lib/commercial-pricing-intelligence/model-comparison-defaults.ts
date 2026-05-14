import type { PricingModelId, PricingModelSpec } from "./types";

/** Default parameters for strategy comparison (each model evaluated independently). */
export const MODEL_COMPARISON_DEFAULTS: Record<PricingModelId, PricingModelSpec> = {
  cost_plus: { modelId: "cost_plus", markupPct: 35 },
  value_based: { modelId: "value_based", valueMultiplier: 1.38 },
  retainer_oriented: { modelId: "retainer_oriented", coverageBufferPct: 22 },
  strategic_account: { modelId: "strategic_account", baseMarkupPct: 32, relationshipDiscountPct: 8 },
  market_penetration: { modelId: "market_penetration", loadedToPriceMultiplier: 1.12 },
  premium_positioning: { modelId: "premium_positioning", loadedToPriceMultiplier: 1.55 },
};
