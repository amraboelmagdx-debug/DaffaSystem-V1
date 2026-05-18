import type { IncentiveSnapshot } from "@/types/incentives";
import type { SalesPlanModel } from "@/lib/sales-plan/build-model";
import { mapSalesPlanModelToMeasureValues } from "@/lib/planning/measures/sales-plan-measure-bridge";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";

export type ReconciliationSeverity = "ok" | "info" | "warning" | "error";

export type DriftCategory =
  | "expected_heuristic"
  | "stale_hydration"
  | "persistence_timing"
  | "calculation_inconsistency";

export type DriftItem = {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
  delta: number;
  deltaPct: number | null;
  severity: ReconciliationSeverity;
  category: DriftCategory;
  explanation: string;
  recommendedAction: string;
};

export type ReconciliationReport = {
  items: DriftItem[];
  severity: ReconciliationSeverity;
  explanations: string[];
};

const PCT_TOLERANCE = 0.005;
const SAR_TOLERANCE = 1;

function classifyDrift(
  id: string,
  severity: ReconciliationSeverity
): { category: DriftCategory; recommendedAction: string } {
  if (severity === "ok") {
    return { category: "expected_heuristic", recommendedAction: "No action required." };
  }
  switch (id) {
    case "projected_revenue":
      return {
        category: "expected_heuristic",
        recommendedAction:
          "Annualized executive monthly revenue often differs from Sales Plan annual model; compare after Apply to workspace.",
      };
    case "incentive_pool_exposure":
      return {
        category: "persistence_timing",
        recommendedAction:
          "Re-run simulation after graph settles, or refresh runs from History after persist completes.",
      };
    case "np_target_pct":
    case "blended_cm":
      return {
        category: "calculation_inconsistency",
        recommendedAction:
          "Apply Sales Plan to workspace, select active scenario, then hard refresh. Check QA persistence truth for hydrate state.",
      };
    case "target_attainment":
      return {
        category: "stale_hydration",
        recommendedAction:
          "Wait for workspace bootstrap to finish or retry sync from Operational gate.",
      };
    default:
      return {
        category: "calculation_inconsistency",
        recommendedAction: "Review inputs on both surfaces; escalate if drift persists after refresh.",
      };
  }
}

function measureValue(
  measures: ExecutiveWorkspaceMeasuresResult | null,
  id: string
): number | null {
  if (!measures) return null;
  const v = measures.valuesByMeasureId[id as keyof typeof measures.valuesByMeasureId];
  return typeof v === "number" ? v : null;
}

function salesPlanMeasure(model: SalesPlanModel | null, id: string): number | null {
  if (!model) return null;
  const mapped = mapSalesPlanModelToMeasureValues(model);
  const row = mapped.find((m) => m.id === id);
  return row?.value ?? null;
}

function comparePair(input: {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  left: number | null;
  right: number | null;
  relativeTolerance?: number;
  absoluteTolerance?: number;
}): DriftItem | null {
  if (input.left == null || input.right == null) return null;
  const delta = input.left - input.right;
  const denom = Math.max(Math.abs(input.left), Math.abs(input.right), 1);
  const deltaPct = delta / denom;
  const rel = input.relativeTolerance ?? PCT_TOLERANCE;
  const abs = input.absoluteTolerance ?? SAR_TOLERANCE;
  const within = Math.abs(delta) <= abs || Math.abs(deltaPct) <= rel;
  const severity: ReconciliationSeverity = within ? "ok" : "warning";
  const { category, recommendedAction } = classifyDrift(input.id, severity);
  return {
    id: input.id,
    label: input.label,
    leftLabel: input.leftLabel,
    rightLabel: input.rightLabel,
    leftValue: input.left,
    rightValue: input.right,
    delta,
    deltaPct,
    severity,
    category,
    explanation: within
      ? `${input.label}: aligned (${input.leftLabel} ${input.left.toFixed(2)} vs ${input.rightLabel} ${input.right.toFixed(2)}).`
      : `${input.label}: drift ${delta.toFixed(2)} (${(deltaPct * 100).toFixed(2)}%) between ${input.leftLabel} and ${input.rightLabel}.`,
    recommendedAction,
  };
}

export type CompareCanonicalOutputsInput = {
  salesPlanModel: SalesPlanModel | null;
  executiveMeasures: ExecutiveWorkspaceMeasuresResult | null;
  wizardNpTargetPct: number | null;
  wizardBlendedCm: number | null;
  incentiveSnapshot: IncentiveSnapshot | null;
  forecastProjectedPoolSar?: number | null;
  forecastAttainmentPct?: number | null;
};

export function compareCanonicalOutputs(
  input: CompareCanonicalOutputsInput
): ReconciliationReport {
  const items: DriftItem[] = [];

  const spRevenue =
    input.salesPlanModel?.annualRevenueSar ??
    salesPlanMeasure(input.salesPlanModel, MEASURE_ID.SALES_PLAN_REVENUE_ANNUAL_SAR);
  const execRevenueMonthly = measureValue(
    input.executiveMeasures,
    MEASURE_ID.REVENUE_SCENARIO_MONTHLY
  );
  const execRevenueAnnual =
    execRevenueMonthly != null ? execRevenueMonthly * 12 : null;

  const revenueDrift = comparePair({
    id: "projected_revenue",
    label: "Projected revenue (annualized)",
    leftLabel: "Sales Plan",
    rightLabel: "Executive (×12)",
    left: spRevenue,
    right: execRevenueAnnual,
    absoluteTolerance: 10_000,
  });
  if (revenueDrift) items.push(revenueDrift);

  const execNp = measureValue(input.executiveMeasures, MEASURE_ID.NP_PCT_SCENARIO);
  const npDrift = comparePair({
    id: "np_target_pct",
    label: "NP target %",
    leftLabel: "Sales Plan wizard",
    rightLabel: "Executive scenario NP%",
    left: input.wizardNpTargetPct,
    right: execNp,
    relativeTolerance: 0.02,
    absoluteTolerance: 0.01,
  });
  if (npDrift) items.push(npDrift);

  const execCmStreams = measureValue(input.executiveMeasures, MEASURE_ID.CM_BLENDED_STREAMS);
  const execCmWorkbook = measureValue(input.executiveMeasures, MEASURE_ID.CM_BLENDED_WORKBOOK);
  const execCm = execCmWorkbook ?? execCmStreams;
  const cmDrift = comparePair({
    id: "blended_cm",
    label: "Blended contribution margin",
    leftLabel: "Sales Plan wizard",
    rightLabel: "Executive CM",
    left: input.wizardBlendedCm,
    right: execCm,
    relativeTolerance: 0.02,
    absoluteTolerance: 0.01,
  });
  if (cmDrift) items.push(cmDrift);

  const pool = input.incentiveSnapshot?.companyTotalSar ?? null;
  const forecastPool = input.forecastProjectedPoolSar ?? null;
  const poolDrift = comparePair({
    id: "incentive_pool_exposure",
    label: "Incentive pool exposure",
    leftLabel: "Run snapshot total",
    rightLabel: "Forecast bridge pool",
    left: pool,
    right: forecastPool,
    absoluteTolerance: 5_000,
  });
  if (poolDrift) items.push(poolDrift);

  const attainment = input.forecastAttainmentPct ?? null;
  const execAttainment = measureValue(
    input.executiveMeasures,
    MEASURE_ID.FORECAST_TARGET_ATTAINMENT_PCT
  );
  const attainmentDrift = comparePair({
    id: "target_attainment",
    label: "Target attainment %",
    leftLabel: "Forward forecast",
    rightLabel: "Executive measure",
    left: attainment,
    right: execAttainment,
    relativeTolerance: 0.03,
    absoluteTolerance: 1,
  });
  if (attainmentDrift) items.push(attainmentDrift);

  const severity: ReconciliationSeverity = items.some((i) => i.severity === "warning")
    ? "warning"
    : items.length === 0
      ? "info"
      : "ok";

  return {
    items,
    severity,
    explanations: items.filter((i) => i.severity !== "ok").map((i) => i.explanation),
  };
}
