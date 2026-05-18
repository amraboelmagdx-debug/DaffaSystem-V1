"use client";

import { useMemo } from "react";
import { evaluateEconomicsGraph } from "@/lib/planning/measures";
import { hrSnapshotFromStore } from "@/lib/planning/operational-feasibility/hr-snapshot-from-store";
import {
  resolvePlanningEvaluation,
  type PlanningEvaluationBlockReason,
} from "@/lib/planning/measures";
import type { EconomicsGraphResult } from "@/lib/platform-economics/evaluation";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";
import type { UsePlanningEvaluationInput } from "@/hooks/use-planning-evaluation";
import type { DemoScenario } from "@/types/domain";
import { useHrWorkforceSnapshotSlice } from "@/hooks/use-hr-workforce-snapshot-slice";

export type EconomicsGraphPhase =
  | { phase: "blocked"; reason: PlanningEvaluationBlockReason }
  | {
      phase: "ready";
      graph: EconomicsGraphResult;
      measures: ExecutiveWorkspaceMeasuresResult;
      activeScenario: DemoScenario;
      forwardForecast: EconomicsGraphResult["forwardForecast"];
    };

export function useEconomicsGraph(
  input: UsePlanningEvaluationInput
): EconomicsGraphPhase {
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

    return {
      phase: "ready",
      graph,
      measures: graph.measures,
      activeScenario: resolution.activeScenario,
      forwardForecast: graph.forwardForecast,
    };
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
