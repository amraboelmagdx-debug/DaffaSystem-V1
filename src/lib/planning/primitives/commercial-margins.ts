import { computeCommercialMargins } from "@/lib/commercial-pricing-intelligence/margin-analytics";
import type { CommercialMarginBlock, OperationalPricingBasis } from "@/lib/commercial-pricing-intelligence/types";

const PLACEHOLDER_BASIS: OperationalPricingBasis = {
  businessUnitId: "",
  serviceTemplateId: "",
  serviceTierId: "",
  templateCode: "",
  tierCode: "",
  templateName: "",
  tierName: "",
  currency: "SAR",
  totalDirectCost: 0,
  totalLoadedCost: 0,
  totalOhContribution: 0,
  totalEffectiveHours: 0,
};

/** Canonical commercial margins (percent) from cost totals and price. */
export function commercialMarginsFromBasis(
  basis: Pick<
    OperationalPricingBasis,
    "totalDirectCost" | "totalLoadedCost" | "totalOhContribution" | "totalEffectiveHours"
  >,
  suggestedPrice: number
): CommercialMarginBlock {
  return computeCommercialMargins(
    { ...PLACEHOLDER_BASIS, ...basis },
    suggestedPrice
  );
}

export function marginsFromPriceAndCostTotals(input: {
  directCost: number;
  loadedCost: number;
  ohContribution: number;
  suggestedPrice: number;
}): Pick<CommercialMarginBlock, "grossMarginPct" | "contributionMarginPct"> {
  const { grossMarginPct, contributionMarginPct } = commercialMarginsFromBasis(
    {
      totalDirectCost: input.directCost,
      totalLoadedCost: input.loadedCost,
      totalOhContribution: input.ohContribution,
      totalEffectiveHours: 0,
    },
    input.suggestedPrice
  );
  return { grossMarginPct, contributionMarginPct };
}
