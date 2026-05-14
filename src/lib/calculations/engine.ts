/**
 * Financial forecasting & ROI engine.
 * ROI = NetProfit / FixedCosts
 * SalesTarget = FixedCosts / max(ε, ContributionMargin - TargetNP)
 */

export type PeriodGranularity = "month" | "quarter" | "year";

export interface CompanyInputs {
  fixedCostsMonthly: number;
  contributionMarginPct: number;
  targetNpPct: number;
  revenueMonthly: number;
  variableCostPct?: number;
  cac?: number;
  ltv?: number;
}

export interface EngineOutputs {
  revenue: number;
  grossProfit: number;
  netProfit: number;
  ebitda: number;
  operatingMarginPct: number;
  npPct: number;
  roi: number;
  burnRateMonthly: number;
  salesTargetRevenue: number;
  salesNeededGap: number;
  paybackMonths: number | null;
  weightedPipelineValue: number;
}

const EPS = 1e-9;

export function contributionFromStreams(
  streams: { revenueWeight: number; contributionMarginPct: number }[]
): number {
  const w = streams.reduce((s, x) => s + x.revenueWeight, 0) || 1;
  return streams.reduce(
    (acc, x) => acc + (x.revenueWeight / w) * x.contributionMarginPct,
    0
  );
}

export function runForecastEngine(
  inputs: CompanyInputs,
  options?: { weightedPipeline?: number }
): EngineOutputs {
  const cm = Math.min(0.999, Math.max(0, inputs.contributionMarginPct));
  const targetNp = Math.min(cm - EPS, Math.max(0, inputs.targetNpPct));
  const revenue = inputs.revenueMonthly;
  const variableCostPct = inputs.variableCostPct ?? 1 - cm;
  const cogs = revenue * variableCostPct;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - inputs.fixedCostsMonthly;
  const ebitda = netProfit;
  const npPct = revenue > 0 ? netProfit / revenue : 0;
  const operatingMarginPct = revenue > 0 ? grossProfit / revenue : 0;
  const roi =
    inputs.fixedCostsMonthly > 0 ? netProfit / inputs.fixedCostsMonthly : 0;
  const burnRateMonthly = netProfit < 0 ? Math.abs(netProfit) : 0;
  const denom = cm - targetNp;
  const salesTargetRevenue =
    denom > EPS ? inputs.fixedCostsMonthly / denom : Number.POSITIVE_INFINITY;
  const salesNeededGap = Math.max(0, salesTargetRevenue - revenue);
  const paybackMonths: number | null = null;
  const weightedPipelineValue = options?.weightedPipeline ?? 0;

  return {
    revenue,
    grossProfit,
    netProfit,
    ebitda,
    operatingMarginPct,
    npPct,
    roi,
    burnRateMonthly,
    salesTargetRevenue: Number.isFinite(salesTargetRevenue)
      ? salesTargetRevenue
      : revenue,
    salesNeededGap: Number.isFinite(salesNeededGap) ? salesNeededGap : 0,
    paybackMonths,
    weightedPipelineValue,
  };
}

export interface ScenarioAssumptions {
  npTargetPct: number;
  revenueMixAdj: number;
  conversionRateAdj: number;
  fixedCostAdj: number;
  growthAdj: number;
  pipelineWeightAdj: number;
}

export function applyScenario(
  base: CompanyInputs,
  scenario: ScenarioAssumptions,
  pipelineWeighted: number
): EngineOutputs {
  const adjFixed =
    base.fixedCostsMonthly * (1 + scenario.fixedCostAdj);
  const adjCm = Math.min(
    0.999,
    Math.max(0.05, base.contributionMarginPct * (1 + scenario.revenueMixAdj * 0.05))
  );
  const adjRevenue =
    base.revenueMonthly * (1 + scenario.growthAdj) * (1 + scenario.conversionRateAdj * 0.1);
  const adjNpTarget = Math.min(adjCm - EPS, scenario.npTargetPct);
  const adjPipeline =
    pipelineWeighted * (1 + scenario.pipelineWeightAdj);
  return runForecastEngine(
    {
      ...base,
      fixedCostsMonthly: adjFixed,
      contributionMarginPct: adjCm,
      revenueMonthly: adjRevenue,
      targetNpPct: adjNpTarget,
    },
    { weightedPipeline: adjPipeline }
  );
}

export function formatCurrency(n: number, currency = "SAR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: n >= 1_000_000 ? 1 : 0,
    notation: Math.abs(n) >= 1_000_000_000 ? "compact" : "standard",
  }).format(n);
}

export function formatPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

/** Centralized P&L building blocks (workbook / matrix formulas). */
export function revenueFromSalesAndShare(sales: number, revenueShare: number) {
  return sales * revenueShare;
}

export function variableCostFromRevenue(
  revenue: number,
  contributionMargin: number
) {
  return revenue * (1 - contributionMargin);
}

export function grossProfitFromRevenue(
  revenue: number,
  contributionMargin: number
) {
  return revenue * contributionMargin;
}

export function netProfitFromContribution(
  revenue: number,
  contributionMargin: number,
  fixedCosts: number
) {
  return revenue * contributionMargin - fixedCosts;
}

export function formatCurrencyLocale(
  n: number,
  locale: string,
  currency = "SAR"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(n) >= 1_000_000 ? 1 : 0,
    notation: Math.abs(n) >= 1_000_000_000 ? "compact" : "standard",
  }).format(n);
}
