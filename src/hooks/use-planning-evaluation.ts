"use client";

import { useMemo } from "react";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream, DemoScenario } from "@/types/domain";
import type { TierLine } from "@/lib/planning/workbook-engine";
import {
  evaluateExecutiveWorkspaceMeasures,
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
  } = input;

  return useMemo(() => {
    const resolution = resolvePlanningEvaluation({
      company,
      streams,
      opportunities,
      scenarios,
      activeScenarioId: selectedScenarioId,
      tierLineOverrides,
    });

    if (resolution.status === "blocked") {
      return { phase: "blocked", reason: resolution.reason };
    }

    const measures = evaluateExecutiveWorkspaceMeasures(resolution.context);
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
  ]);
}
