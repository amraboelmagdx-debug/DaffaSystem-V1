import { attributeScenarioComparison } from "@/lib/planning/assumption-attribution";
import { evaluateExecutiveWorkspaceMeasures } from "@/lib/planning/measures/executive-workspace-measures";
import { computeWorkbookPlanningSlice } from "@/lib/planning/measures/workbook-planning-slice";
import {
  buildFeasibilityEvalContext,
  compareOperationalFeasibility,
  evaluateOperationalFeasibility,
} from "@/lib/planning/operational-feasibility";
import { compareScenarios } from "@/lib/planning/scenario-comparison";
import { evaluateScenarioBundle } from "@/lib/planning/scenario-comparison/evaluate-scenario-bundle";
import {
  evaluateForwardForecast,
  forwardForecastAsMeasureValues,
} from "@/lib/planning/forward-forecast";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import type { EvaluateEconomicsGraphInput, EconomicsGraphResult } from "./types";

export function evaluateEconomicsGraph(
  input: EvaluateEconomicsGraphInput
): EconomicsGraphResult {
  const {
    company,
    streams,
    opportunities,
    scenarios,
    activeScenarioId,
    tierLineOverrides,
    scenarioBundles,
    hrSnapshot,
    serviceEconomicsMeasures,
    dealEconomicsRollup,
    comparison,
    options,
  } = input;

  const measures = evaluateExecutiveWorkspaceMeasures(input, {
    hrSnapshot,
    serviceEconomicsMeasures,
    dealEconomicsRollup,
  });

  const workbookByScenarioId: Record<string, ReturnType<typeof computeWorkbookPlanningSlice>> =
    {};

  if (options?.includeWorkbookByScenario !== false && scenarioBundles) {
    const companyStreams = streams.filter((s) => s.companyId === company.id);
    const evalCommon = {
      anchorCompany: company,
      streams: companyStreams,
      opportunities,
    };
    for (const sc of scenarios) {
      const bundle = scenarioBundles[sc.id];
      if (bundle) {
        workbookByScenarioId[sc.id] = evaluateScenarioBundle({
          ...evalCommon,
          bundle,
        }).workbook;
      } else {
        workbookByScenarioId[sc.id] = computeWorkbookPlanningSlice({
          streams: companyStreams,
          tierLineOverrides,
          fixedCostsMonthly: company.fixedCostsMonthly,
          npTargetPct: sc.npTargetPct,
        });
      }
    }
  }

  const result: EconomicsGraphResult = { measures, workbookByScenarioId };

  if (options?.includeForwardForecast !== false) {
    result.forwardForecast = evaluateForwardForecast({
      context: {
        company,
        streams,
        opportunities,
        scenarios,
        activeScenarioId,
        tierLineOverrides,
        scenarioBundles,
      },
      measures,
      workbookByScenarioId,
      hrSnapshot,
    });
    measures.valuesByMeasureId = {
      ...measures.valuesByMeasureId,
      ...forwardForecastAsMeasureValues(result.forwardForecast),
    };
  }

  if (comparison && scenarioBundles) {
    const baseBundle = scenarioBundles[comparison.baseId];
    const compareBundle = scenarioBundles[comparison.compareId];
    if (baseBundle && compareBundle) {
      result.comparison = compareScenarios({
        anchorCompany: company,
        streams,
        opportunities,
        bundlesById: scenarioBundles,
        baseScenarioId: comparison.baseId,
        compareScenarioId: comparison.compareId,
      });

      if (options?.includeAttribution && result.comparison) {
        const compareContext = {
          anchorCompany: company,
          streams,
          opportunities,
          bundlesById: scenarioBundles,
          baseScenarioId: comparison.baseId,
          compareScenarioId: comparison.compareId,
        };
        result.attribution = attributeScenarioComparison({
          comparison: result.comparison,
          context: compareContext,
        });
      }

      if (options?.includeFeasibility && hrSnapshot) {
        const compareContext = {
          anchorCompany: company,
          streams,
          opportunities,
          bundlesById: scenarioBundles,
          baseScenarioId: comparison.baseId,
          compareScenarioId: comparison.compareId,
        };
        result.feasibility = compareOperationalFeasibility({
          comparison: result.comparison,
          context: compareContext,
          hrSnapshot,
        });
      }
    }
  }

  if (
    options?.includeFeasibility &&
    hrSnapshot &&
    scenarioBundles &&
    !result.feasibility
  ) {
    const activeBundle = scenarioBundles[activeScenarioId];
    if (activeBundle) {
      const baselineScenario = scenarios.find((s) => s.baseline);
      const baselineBundle = baselineScenario
        ? scenarioBundles[baselineScenario.id]
        : undefined;
      const feasCtx = buildFeasibilityEvalContext({
        anchorCompany: company,
        streams: streams.filter((s) => s.companyId === company.id),
        opportunities,
        bundle: mergeGovernanceOnHydrate(activeBundle),
        baselineBundle: baselineBundle
          ? mergeGovernanceOnHydrate(baselineBundle)
          : undefined,
        hrSnapshot,
      });
      result.feasibility = evaluateOperationalFeasibility(feasCtx);
    }
  }

  return result;
}
