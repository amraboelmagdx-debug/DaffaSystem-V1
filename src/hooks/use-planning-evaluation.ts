"use client";

import { useMemo } from "react";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream, DemoScenario } from "@/types/domain";
import type { TierLine } from "@/lib/planning/workbook-engine";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import {
  evaluateEconomicsGraph,
  resolvePlanningEvaluation,
  type ExecutiveWorkspaceMeasuresResult,
  type PlanningEvaluationBlockReason,
} from "@/lib/planning/measures";

export type UsePlanningEvaluationInput = {
  company: DemoCompany | null | undefined;
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  scenarios: DemoScenario[];
  selectedScenarioId: string;
  tierLineOverrides: Record<string, TierLine[]>;
  scenarioBundles?: Record<string, ScenarioPlanningBundle>;
};

export type PlanningEvaluationPhase =
  | { phase: "blocked"; reason: PlanningEvaluationBlockReason }
  | {
      phase: "ready";
      measures: ExecutiveWorkspaceMeasuresResult;
      activeScenario: DemoScenario;
    };

export function usePlanningEvaluation(input: UsePlanningEvaluationInput): PlanningEvaluationPhase {
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

    const measures = evaluateEconomicsGraph({
      ...resolution.context,
      options: { includeForwardForecast: false },
    }).measures;
    return {
      phase: "ready",
      measures,
      activeScenario: resolution.activeScenario,
    };
  }, [
    company,
    streams,
    opportunities,
    scenarios,
    selectedScenarioId,
    tierLineOverrides,
    scenarioBundles,
  ]);
}
