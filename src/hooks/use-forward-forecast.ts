"use client";

import { useMemo } from "react";
import { evaluateEconomicsGraph } from "@/lib/planning/measures";
import { hrSnapshotFromStore } from "@/lib/planning/operational-feasibility/hr-snapshot-from-store";
import type { UsePlanningEvaluationInput } from "@/hooks/use-planning-evaluation";
import {
  resolvePlanningEvaluation,
  type PlanningEvaluationBlockReason,
} from "@/lib/planning/measures";
import type { ForwardForecastResult } from "@/types/forward-forecast";
import { useHrWorkforceSnapshotSlice } from "@/hooks/use-hr-workforce-snapshot-slice";

export type ForwardForecastPhase =
  | { phase: "blocked"; reason: PlanningEvaluationBlockReason }
  | { phase: "ready"; forwardForecast: ForwardForecastResult };

export function useForwardForecast(
  input: UsePlanningEvaluationInput
): ForwardForecastPhase {
  const hrSlice = useHrWorkforceSnapshotSlice();

  const {
    company,
    streams,
    opportunities,
    scenarios,
    selectedScenarioId,
    tierLineOverrides,
    scenarioBundles,
  } = input;

  return useMemo(() => {
    const resolution = resolvePlanningEvaluation({
      company,
      streams,
      opportunities,
      scenarios,
      activeScenarioId: selectedScenarioId,
      tierLineOverrides,
      scenarioBundles,
    });

    if (resolution.status === "blocked") {
      return { phase: "blocked", reason: resolution.reason };
    }

    const hrSnapshot = hrSnapshotFromStore(hrSlice);
    const graph = evaluateEconomicsGraph({
      ...resolution.context,
      hrSnapshot,
      options: { includeForwardForecast: true },
    });

    if (!graph.forwardForecast) {
      return { phase: "blocked", reason: "no_scenarios" };
    }

    return { phase: "ready", forwardForecast: graph.forwardForecast };
  }, [
    company,
    streams,
    opportunities,
    scenarios,
    selectedScenarioId,
    tierLineOverrides,
    scenarioBundles,
    hrSlice,
  ]);
}
