import type { ForwardForecastResult } from "@/types/forward-forecast";
import type { IncentiveDealInput, IncentiveTargetScorecard } from "@/types/incentives";
import type { DemoCompany } from "@/types/domain";
import { resolveDealTierKey } from "@/lib/planning/resolve-opportunity-tier-profile";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";

export function dealsFromForwardForecast(
  forecast: ForwardForecastResult,
  company?: Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null,
  marginPct = 0.35
): IncentiveDealInput[] {
  return forecast.financial.points
    .filter((p) => p.revenue > 0)
    .map((p, i) => {
      const dealValueSar = Math.round(p.revenue);
      return {
        id: `ff-${p.period}`,
        label: `Forecast ${p.period}`,
        tierKey: resolveDealTierKey(dealValueSar, company),
        dealValueSar,
        marginSar: Math.round(p.grossProfit || dealValueSar * marginPct),
        referral: false,
        clientType: "existing_client" as const,
        complexity: "normal" as const,
        accrualMonth: p.period.slice(0, 7),
      };
    });
}

export function scorecardAttainmentFromEconomicsMeasures(
  scorecard: IncentiveTargetScorecard,
  measures: ExecutiveWorkspaceMeasuresResult | null,
  forecast: ForwardForecastResult | null
): {
  multiplier: number;
  attainmentByComponent: Record<string, number>;
  explainInputs: Record<string, number | string>;
} {
  if (!measures && !forecast) {
    return { multiplier: 1, attainmentByComponent: {}, explainInputs: {} };
  }

  const attainmentByComponent: Record<string, number> = {};
  for (const c of scorecard.components) {
    if (c.actualSource === "planning_scenario" && forecast) {
      attainmentByComponent[c.id] =
        c.targetValue > 0
          ? forecast.targets.attainmentPct / 100 / c.targetValue
          : forecast.targets.attainmentPct / 100;
    } else if (c.actualSource === "sales_plan" && measures) {
      const rev = measures.valuesByMeasureId[MEASURE_ID.SALES_PLAN_REVENUE_ANNUAL_SAR] ?? 0;
      attainmentByComponent[c.id] = c.targetValue > 0 ? rev / c.targetValue : 0;
    } else {
      attainmentByComponent[c.id] = c.actualValue ?? 0;
    }
  }

  let weighted = 0;
  let weightSum = 0;
  for (const c of scorecard.components) {
    const att = attainmentByComponent[c.id] ?? 0;
    weighted += att * c.weight;
    weightSum += c.weight;
  }
  const avg = weightSum > 0 ? weighted / weightSum : 1;
  const multiplier = Math.min(1.25, Math.max(0.75, 0.75 + avg * 0.5));

  return {
    multiplier,
    attainmentByComponent,
    explainInputs: {
      weightedAvg: avg,
      forecastAttainmentPct: forecast?.targets.attainmentPct ?? 0,
    },
  };
}

export function projectedPayoutExposureSar(
  poolTotal: number,
  forecast: ForwardForecastResult | null
): number {
  if (!forecast?.financial.points.length) return poolTotal;
  const months = forecast.financial.points.length;
  return poolTotal / Math.max(1, months);
}
