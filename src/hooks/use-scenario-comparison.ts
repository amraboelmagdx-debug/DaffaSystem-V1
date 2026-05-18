"use client";

import { useMemo } from "react";
import { compareScenarios, ScenarioComparisonError } from "@/lib/planning/scenario-comparison";
import { useComparisonNarrativeLabels } from "@/lib/planning/scenario/use-comparison-narrative-labels";
import type { ScenarioComparisonResult } from "@/types/scenario-comparison";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream } from "@/types/domain";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";

export type UseScenarioComparisonInput = {
  anchorCompany: DemoCompany | null | undefined;
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  scenarioBundles: Record<string, ScenarioPlanningBundle>;
  baseScenarioId: string;
  compareScenarioId: string;
  enabled?: boolean;
};

export type ScenarioComparisonPhase =
  | { phase: "idle" }
  | { phase: "blocked"; reason: "no_company" | "missing_ids" | "same_scenario" }
  | { phase: "error"; message: string }
  | { phase: "ready"; result: ScenarioComparisonResult };

export function useScenarioComparison(input: UseScenarioComparisonInput): ScenarioComparisonPhase {
  const labels = useComparisonNarrativeLabels();
  const {
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
    if (!anchorCompany) return { phase: "blocked" as const, reason: "no_company" as const };
    if (!baseScenarioId || !compareScenarioId) {
      return { phase: "blocked" as const, reason: "missing_ids" as const };
    }
    if (baseScenarioId === compareScenarioId) {
      return { phase: "blocked" as const, reason: "same_scenario" as const };
    }

    try {
      const result = compareScenarios(
        {
          anchorCompany,
          streams,
          opportunities,
          bundlesById: scenarioBundles,
          baseScenarioId,
          compareScenarioId,
        },
        labels
      );
      return { phase: "ready" as const, result };
    } catch (e) {
      const message =
        e instanceof ScenarioComparisonError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Comparison failed";
      return { phase: "error" as const, message };
    }
  }, [
    enabled,
    anchorCompany,
    streams,
    opportunities,
    scenarioBundles,
    baseScenarioId,
    compareScenarioId,
    labels,
  ]);
}
