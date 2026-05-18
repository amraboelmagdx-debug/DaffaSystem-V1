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
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

export type ForwardForecastPhase =
  | { phase: "blocked"; reason: PlanningEvaluationBlockReason }
  | { phase: "ready"; forwardForecast: ForwardForecastResult };

export function useForwardForecast(
  input: UsePlanningEvaluationInput
): ForwardForecastPhase {
  const hrSlice = useHrWorkforceStore((s) => ({
    roles: s.roles,
    businessUnits: s.businessUnits,
    departments: s.departments,
    teams: s.teams,
    hrGlobalSettings: s.hrGlobalSettings,
    ohManualByBusinessUnitId: s.ohManualByBusinessUnitId,
  }));

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
