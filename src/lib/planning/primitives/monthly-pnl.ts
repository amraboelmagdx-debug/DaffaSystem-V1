import {
  runForecastEngine,
  type CompanyInputs,
  type EngineOutputs,
} from "@/lib/calculations/engine";

export type MonthlyPnLInputs = Pick<
  CompanyInputs,
  "fixedCostsMonthly" | "contributionMarginPct" | "targetNpPct" | "revenueMonthly"
>;

/** Single-period P&L from company CM inputs (forecast sandbox / rolling series). */
export function monthlyPnLFromCm(inputs: MonthlyPnLInputs): Pick<
  EngineOutputs,
  "revenue" | "grossProfit" | "netProfit"
> {
  const out = runForecastEngine(inputs);
  return {
    revenue: out.revenue,
    grossProfit: out.grossProfit,
    netProfit: out.netProfit,
  };
}

/** Recompute dependent metrics when revenue is edited in the forecast grid. */
export function monthlyPnLFromRevenueEdit(
  revenue: number,
  inputs: MonthlyPnLInputs
): Pick<EngineOutputs, "revenue" | "grossProfit" | "netProfit"> {
  return monthlyPnLFromCm({ ...inputs, revenueMonthly: revenue });
}
