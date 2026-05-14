import type { CommercialMarginThresholds, PricingModelSpec } from "./types";

export const DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS: CommercialMarginThresholds = {
  minGrossMarginPct: 25,
  minContributionMarginPct: 12,
  pricingSafetyContributionMarginPct: 5,
};

export const DEFAULT_PRICING_MODEL_SPEC: PricingModelSpec = {
  modelId: "cost_plus",
  markupPct: 35,
};
