import type { ServiceOpportunityTierBand } from "@/types/service-architecture";
import { DEFAULT_OPPORTUNITY_TIERS } from "@/data/opportunity-tiers-defaults";

export function defaultOpportunityTierBandsForTemplate(): ServiceOpportunityTierBand[] {
  return DEFAULT_OPPORTUNITY_TIERS.map((t) => ({
    tierKey: t.key,
    active: true,
    minValueSar: t.minValueSar,
    maxValueSar: t.maxValueSar,
    avgDealValueSar:
      t.maxValueSar != null
        ? Math.round((t.minValueSar + t.maxValueSar) / 2)
        : t.minValueSar * 2,
  }));
}
