import { buildBuForecastContext } from "@/lib/planning/measures/bu-forecast-context";
import type { PlanningContext } from "@/lib/planning/measures/planning-context";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";
import type { EconomicsGraphResult } from "@/lib/platform-economics/evaluation/types";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";
import type { MeasureId } from "@/lib/planning/measures/measure-ids";
import type { ForwardForecastResult, ForecastHorizon } from "@/types/forward-forecast";
import type { HrWorkforceSnapshot } from "@/types/operational-feasibility";
import { defaultForecastHorizon } from "./horizon";
import { buildForwardForecastNarrative } from "./forward-forecast-narrative";
import { projectFinancialTrajectory } from "./project-financial-trajectory";
import { projectOperationalTrajectory } from "./project-operational-trajectory";
import { projectTargetAttainment } from "./project-target-attainment";

export type EvaluateForwardForecastInput = {
  context: PlanningContext;
  measures: ExecutiveWorkspaceMeasuresResult;
  workbookByScenarioId?: EconomicsGraphResult["workbookByScenarioId"];
  hrSnapshot?: HrWorkforceSnapshot | null;
  horizon?: ForecastHorizon;
};

export function evaluateForwardForecast(
  input: EvaluateForwardForecastInput
): ForwardForecastResult {
  const horizon = input.horizon ?? defaultForecastHorizon(12);
  const financial = projectFinancialTrajectory({
    context: input.context,
    measures: input.measures,
    horizon,
  });
  const operational = projectOperationalTrajectory({
    context: input.context,
    measures: input.measures,
    financial,
    horizon,
    hrSnapshot: input.hrSnapshot,
  });
  const targets = projectTargetAttainment(financial, input.measures);
  const narrative = buildForwardForecastNarrative({
    context: input.context,
    financial,
    operational,
    targets,
  });

  const activeScenario = input.measures.activeScenario;
  const buContext = buildBuForecastContext(input.context.company, activeScenario.id);

  return {
    meta: {
      companyId: input.context.company.id,
      scenarioId: activeScenario.id,
      scenarioName: activeScenario.name,
      horizon,
      buContext,
    },
    financial,
    operational,
    targets,
    narrative,
  };
}

/** Map forward forecast headline KPIs to canonical measure ids. */
export function forwardForecastAsMeasureValues(
  result: ForwardForecastResult
): Partial<Record<MeasureId, number>> {
  const out: Partial<Record<MeasureId, number>> = {
    [MEASURE_ID.FORECAST_MARGIN_TREND_PCT]: result.financial.marginTrendPct,
    [MEASURE_ID.FORECAST_END_REVENUE]:
      result.financial.points[result.financial.points.length - 1]?.revenue ?? 0,
    [MEASURE_ID.FORECAST_TARGET_ATTAINMENT_PCT]: result.targets.attainmentPct,
  };
  if (result.targets.monthsToTarget != null) {
    out[MEASURE_ID.FORECAST_MONTHS_TO_TARGET] = result.targets.monthsToTarget;
  }
  if (result.operational.firstSaturationMonth) {
    out[MEASURE_ID.FORECAST_FIRST_SATURATION_MONTH] = 1;
  }
  return out;
}
