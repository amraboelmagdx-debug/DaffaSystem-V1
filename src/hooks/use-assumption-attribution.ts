"use client";

import { useMemo } from "react";
import { attributeScenarioComparison } from "@/lib/planning/assumption-attribution";
import { useAttributionNarrativeLabels } from "@/lib/planning/scenario/use-attribution-narrative-labels";
import type { AssumptionAttributionResult } from "@/types/scenario-attribution";
import type { CompareScenariosInput, ScenarioComparisonResult } from "@/types/scenario-comparison";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream } from "@/types/domain";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";

export type UseAssumptionAttributionInput = {
  comparison: ScenarioComparisonResult | null | undefined;
  anchorCompany: DemoCompany | null | undefined;
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  scenarioBundles: Record<string, ScenarioPlanningBundle>;
  baseScenarioId: string;
  compareScenarioId: string;
  enabled?: boolean;
};

export type AssumptionAttributionPhase =
  | { phase: "idle" }
  | { phase: "blocked"; reason: "no_company" | "missing_ids" | "same_scenario" | "no_comparison" }
  | { phase: "ready"; result: AssumptionAttributionResult };

export function useAssumptionAttribution(
  input: UseAssumptionAttributionInput
): AssumptionAttributionPhase {
  const labels = useAttributionNarrativeLabels();
  const {
    comparison,
    anchorCompany,
    streams,
    opportunities,
    scenarioBundles,
    baseScenarioId,
    compareScenarioId,
    enabled = true,
  } = input;

  return useMemo(() => {
    if (!enabled) return { phase: "idle" as const };
    if (!comparison) return { phase: "blocked" as const, reason: "no_comparison" as const };
    if (!anchorCompany) return { phase: "blocked" as const, reason: "no_company" as const };
    if (!baseScenarioId || !compareScenarioId) {
      return { phase: "blocked" as const, reason: "missing_ids" as const };
    }
    if (baseScenarioId === compareScenarioId) {
      return { phase: "blocked" as const, reason: "same_scenario" as const };
    }

    const context: CompareScenariosInput = {
      anchorCompany,
      streams,
      opportunities,
      bundlesById: scenarioBundles,
      baseScenarioId,
      compareScenarioId,
    };

    const result = attributeScenarioComparison({ comparison, context }, labels);
    return { phase: "ready" as const, result };
  }, [
    enabled,
    comparison,
    anchorCompany,
    streams,
    opportunities,
    scenarioBundles,
    baseScenarioId,
    compareScenarioId,
    labels,
  ]);
}
