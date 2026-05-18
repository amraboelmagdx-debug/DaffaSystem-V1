import type {
  CompareOperationalFeasibilityInput,
  OperationalFeasibilityComparison,
} from "@/types/operational-feasibility";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import { buildFeasibilityEvalContext } from "./build-feasibility-context";
import { evaluateOperationalFeasibility } from "./evaluate-operational-feasibility";
import { buildOperationalFeasibilityNarrative } from "./operational-feasibility-narrative";
import type { OperationalFeasibilityNarrativeLabels } from "@/types/operational-feasibility";

export function compareOperationalFeasibility(
  input: CompareOperationalFeasibilityInput,
  labels?: OperationalFeasibilityNarrativeLabels
): OperationalFeasibilityComparison {
  const { comparison, context, hrSnapshot, serviceHoursByTemplateId, salesPlanLoadIndex } = input;
  const baseBundle = mergeGovernanceOnHydrate(
    context.bundlesById[context.baseScenarioId]!
  );
  const compareBundle = mergeGovernanceOnHydrate(
    context.bundlesById[context.compareScenarioId]!
  );

  const baseCtx = buildFeasibilityEvalContext({
    anchorCompany: context.anchorCompany,
    streams: context.streams,
    opportunities: context.opportunities,
    bundle: baseBundle,
    hrSnapshot,
    serviceHoursByTemplateId,
    salesPlanLoadIndex,
  });

  const compareCtx = buildFeasibilityEvalContext({
    anchorCompany: context.anchorCompany,
    streams: context.streams,
    opportunities: context.opportunities,
    bundle: compareBundle,
    baselineBundle: baseBundle,
    hrSnapshot,
    serviceHoursByTemplateId,
    salesPlanLoadIndex,
  });

  const base = evaluateOperationalFeasibility(baseCtx, labels);
  const compare = evaluateOperationalFeasibility(compareCtx, labels);

  const feasibilityMode = base.feasibilityMode === "hr_backed" ? "hr_backed" : "unavailable";

  const baseUtil = base.saturation?.buUtilizationPct ?? null;
  const compareUtil = compare.saturation?.buUtilizationPct ?? null;
  const utilizationDeltaPct =
    baseUtil != null && compareUtil != null ? compareUtil - baseUtil : null;

  const baseBottlenecks = new Set(base.roleRows.filter((r) => r.isBottleneck).map((r) => r.roleId));
  const newBottleneckRoleIds = compare.roleRows
    .filter((r) => r.isBottleneck && !baseBottlenecks.has(r.roleId))
    .map((r) => r.roleId);

  if (labels && compare.feasibilityMode === "hr_backed") {
    compare.narrative = buildOperationalFeasibilityNarrative(
      {
        status: compare.status,
        meta: compare.meta,
        roleRows: compare.roleRows,
        servicePressures: compare.servicePressures,
        staffing: compare.staffing,
        saturation: compare.saturation,
        risks: compare.risks,
        buUtilizationPct: compareUtil ?? undefined,
        scenarioName: comparison.meta.compareName,
      },
      labels,
      "compare"
    );
  }

  return {
    meta: {
      companyId: comparison.meta.companyId,
      baseScenarioId: comparison.meta.baseScenarioId,
      compareScenarioId: comparison.meta.compareScenarioId,
      baseName: comparison.meta.baseName,
      compareName: comparison.meta.compareName,
    },
    feasibilityMode,
    base,
    compare,
    utilizationDeltaPct,
    statusDelta: {
      base: base.status,
      compare: compare.status,
      shifted: base.status !== compare.status,
    },
    newBottleneckRoleIds,
    suppressCapacityProxyNarrative: feasibilityMode === "hr_backed",
  };
}
