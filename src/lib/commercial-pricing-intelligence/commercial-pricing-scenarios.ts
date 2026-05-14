import type { CommercialPricingScenarioModifier } from "./types";

export const COMMERCIAL_PRICING_SCENARIO_PRESETS: CommercialPricingScenarioModifier[] = [
  {
    id: "neutral",
    label: "Neutral commercial stance",
    description: "No extra commercial posture on top of model + risks.",
    priceMultiplier: 1,
    competitivenessNote: "Baseline — compare other scenarios from here.",
  },
  {
    id: "aggressive_market",
    label: "Aggressive market pricing",
    description: "Prioritize win-rate over headline margin.",
    priceMultiplier: 0.92,
    competitivenessNote: "Lower price band vs loaded economics.",
  },
  {
    id: "scenario_premium_positioning",
    label: "Premium positioning",
    description: "Lead with brand and outcome premium.",
    priceMultiplier: 1.12,
    competitivenessNote: "Upper price band — justify with delivery proof.",
  },
  {
    id: "strategic_relationship",
    label: "Strategic relationship",
    description: "Blend of partnership value and sustainable margin.",
    priceMultiplier: 1.02,
    competitivenessNote: "Slight uplift for long-term account value.",
  },
  {
    id: "market_entry",
    label: "Market entry",
    description: "Land-and-expand posture.",
    priceMultiplier: 0.88,
    competitivenessNote: "Entry pricing — monitor contribution margin closely.",
  },
  {
    id: "high_growth",
    label: "High-growth mode",
    description: "Reinvestment posture with selective premium.",
    priceMultiplier: 1.05,
    competitivenessNote: "Balance growth vs delivery capacity.",
  },
  {
    id: "profitability_focus",
    label: "Profitability maximizing",
    description: "Favor contribution over top-line speed.",
    priceMultiplier: 1.15,
    competitivenessNote: "Higher price band — watch competitiveness.",
  },
];

export function getCommercialPricingScenarioById(id: string): CommercialPricingScenarioModifier {
  return COMMERCIAL_PRICING_SCENARIO_PRESETS.find((s) => s.id === id) ?? COMMERCIAL_PRICING_SCENARIO_PRESETS[0];
}
