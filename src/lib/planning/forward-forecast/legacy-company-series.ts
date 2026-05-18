import { monthlyPnLFromCm } from "@/lib/planning/primitives";
import type { DemoCompany, DemoForecastMonth } from "@/types/domain";
import { defaultForecastHorizon, periodLabels } from "./horizon";

/** Grid sandbox / deprecated Path A: company settings only (no scenario levers). */
export function projectLegacyCompanyForecastSeries(company: DemoCompany): DemoForecastMonth[] {
  const horizon = defaultForecastHorizon(12);
  const labels = periodLabels(horizon);
  const base = company.revenueMonthly;
  const g = company.growthTargetPct / 12;
  const pnlInputs = {
    fixedCostsMonthly: company.fixedCostsMonthly,
    contributionMarginPct: company.contributionMarginPct,
    targetNpPct: company.npTargetPct,
    revenueMonthly: base,
  };

  return Array.from({ length: horizon.months }, (_, i) => {
    const revenue = base * (1 + g * i);
    const { grossProfit, netProfit } = monthlyPnLFromCm({
      ...pnlInputs,
      revenueMonthly: revenue,
    });
    return {
      month: labels[i]!,
      revenue,
      grossProfit,
      netProfit,
    };
  });
}
