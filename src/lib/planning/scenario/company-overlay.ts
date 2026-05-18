import type { CompanyPlanningOverlay } from "@/types/planning-scenario";
import type { DemoCompany } from "@/types/domain";
import { mergeOpportunityTiersWithDefaults } from "@/data/opportunity-tiers-defaults";

export function companyOverlayFromCompany(company: DemoCompany): CompanyPlanningOverlay {
  return {
    fixedCostsMonthly: company.fixedCostsMonthly,
    growthTargetPct: company.growthTargetPct,
    marginTargetPct: company.marginTargetPct,
    npTargetPct: company.npTargetPct,
    revenueMonthly: company.revenueMonthly,
    contributionMarginPct: company.contributionMarginPct,
    opportunityTiers: mergeOpportunityTiersWithDefaults(company.opportunityTiers).map((t) => ({
      ...t,
    })),
  };
}

export function cloneCompanyOverlay(overlay: CompanyPlanningOverlay): CompanyPlanningOverlay {
  return {
    ...overlay,
    opportunityTiers: overlay.opportunityTiers?.map((t) => ({ ...t })) ?? undefined,
  };
}
