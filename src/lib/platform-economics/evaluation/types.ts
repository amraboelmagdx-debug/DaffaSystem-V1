import type { DealEconomicsMeasures } from "@/lib/deal-economics/types";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";
import type { PlanningContext } from "@/lib/planning/measures/planning-context";
import type { EvaluateExecutiveWorkspaceMeasuresOptions } from "@/lib/planning/measures/executive-workspace-measures";
import type { computeWorkbookPlanningSlice } from "@/lib/planning/measures/workbook-planning-slice";
import type { ServiceEconomicsMeasures } from "@/lib/service-economics/types";
import type { AssumptionAttributionResult } from "@/types/scenario-attribution";
import type { ScenarioComparisonResult } from "@/types/scenario-comparison";
import type {
  OperationalFeasibilityComparison,
  OperationalFeasibilityResult,
} from "@/types/operational-feasibility";
import type { HrWorkforceSnapshot } from "@/types/operational-feasibility";
import type { ForwardForecastResult } from "@/types/forward-forecast";

export type WorkbookSlice = ReturnType<typeof computeWorkbookPlanningSlice>;

export type EvaluateEconomicsGraphInput = PlanningContext & {
  hrSnapshot?: HrWorkforceSnapshot | null;
  serviceEconomicsMeasures?: ServiceEconomicsMeasures | null;
  dealEconomicsRollup?: DealEconomicsMeasures | null;
  comparison?: { baseId: string; compareId: string } | null;
  options?: {
    includeAttribution?: boolean;
    includeFeasibility?: boolean;
    includeWorkbookByScenario?: boolean;
    includeForwardForecast?: boolean;
  };
};

export type EconomicsGraphResult = {
  measures: ExecutiveWorkspaceMeasuresResult;
  workbookByScenarioId: Record<string, WorkbookSlice>;
  comparison?: ScenarioComparisonResult;
  attribution?: AssumptionAttributionResult;
  feasibility?: OperationalFeasibilityResult | OperationalFeasibilityComparison;
  forwardForecast?: ForwardForecastResult;
};

export type { EvaluateExecutiveWorkspaceMeasuresOptions };
