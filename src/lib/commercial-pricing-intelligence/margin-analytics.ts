import type {
  CommercialMarginBlock,
  CommercialMarginThresholds,
  OperationalPricingBasis,
} from "./types";

const EPS = 1e-9;

export function computeCommercialMargins(
  basis: OperationalPricingBasis,
  suggestedPrice: number
): CommercialMarginBlock {
  const p = Math.max(EPS, suggestedPrice);
  const gross = ((p - basis.totalDirectCost) / p) * 100;
  const contrib = ((p - basis.totalLoadedCost) / p) * 100;
  return {
    grossMarginPct: gross,
    contributionMarginPct: contrib,
    loadedCostRatio: basis.totalLoadedCost / p,
    ohShareOfPricePct: (basis.totalOhContribution / p) * 100,
    directCostShareOfPricePct: (basis.totalDirectCost / p) * 100,
  };
}

export function buildMarginWarnings(
  margins: CommercialMarginBlock,
  thresholds: CommercialMarginThresholds
): string[] {
  const w: string[] = [];
  if (margins.grossMarginPct < thresholds.minGrossMarginPct) {
    w.push(
      `Gross margin (${margins.grossMarginPct.toFixed(1)}%) is below target (${thresholds.minGrossMarginPct}%).`
    );
  }
  if (margins.contributionMarginPct < thresholds.minContributionMarginPct) {
    w.push(
      `Contribution margin (${margins.contributionMarginPct.toFixed(1)}%) is below guidance (${thresholds.minContributionMarginPct}%).`
    );
  }
  if (margins.contributionMarginPct < thresholds.pricingSafetyContributionMarginPct) {
    w.push(
      `Pricing safety: contribution margin (${margins.contributionMarginPct.toFixed(1)}%) is below the hard floor (${thresholds.pricingSafetyContributionMarginPct}%).`
    );
  }
  if (margins.ohShareOfPricePct > 45) {
    w.push("OH sensitivity: overhead represents a large share of price — small delivery overrun compresses margin quickly.");
  }
  return w;
}
