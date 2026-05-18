import type { DemoCompany, DemoScenario } from "@/types/domain";
import { buildPlanningContext, type PlanningContext } from "./planning-context";

export type PlanningEvaluationBlockReason =
  | "no_company"
  | "no_scenarios"
  | "active_scenario_not_found";

export type PlanningEvaluationReady = {
  status: "ready";
  context: PlanningContext;
  activeScenario: DemoScenario;
};

export type PlanningEvaluationBlocked = {
  status: "blocked";
  reason: PlanningEvaluationBlockReason;
};

export type PlanningEvaluationResolution = PlanningEvaluationReady | PlanningEvaluationBlocked;

export class PlanningEvaluationInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanningEvaluationInvariantError";
  }
}

export type ResolvePlanningEvaluationInput = {
  company: DemoCompany | null | undefined;
  streams: PlanningContext["streams"];
  opportunities: PlanningContext["opportunities"];
  scenarios: DemoScenario[];
  activeScenarioId: string;
  tierLineOverrides: PlanningContext["tierLineOverrides"];
};

/**
 * Resolves whether planning measures can be evaluated for the current workspace slice.
 * Policy: empty or stale `activeScenarioId` falls back to `scenarios[0]` when scenarios exist.
 */
export function resolveActiveScenario(
  scenarios: DemoScenario[],
  activeScenarioId: string
): DemoScenario | null {
  if (scenarios.length === 0) return null;
  const trimmed = activeScenarioId.trim();
  if (trimmed) {
    const found = scenarios.find((s) => s.id === trimmed);
    if (found) return found;
  }
  return scenarios[0] ?? null;
}

export function resolvePlanningEvaluation(
  input: ResolvePlanningEvaluationInput
): PlanningEvaluationResolution {
  if (!input.company) {
    return { status: "blocked", reason: "no_company" };
  }
  if (input.scenarios.length === 0) {
    return { status: "blocked", reason: "no_scenarios" };
  }

  const activeScenario = resolveActiveScenario(input.scenarios, input.activeScenarioId);
  if (!activeScenario) {
    return { status: "blocked", reason: "active_scenario_not_found" };
  }

  const context = buildPlanningContext({
    company: input.company,
    streams: input.streams,
    opportunities: input.opportunities,
    scenarios: input.scenarios,
    activeScenarioId: activeScenario.id,
    tierLineOverrides: input.tierLineOverrides,
  });

  return { status: "ready", context, activeScenario };
}

/** Call only after `resolvePlanningEvaluation` returns ready. */
export function assertPlanningEvaluationContext(
  input: PlanningContext
): asserts input is PlanningContext & { scenarios: [DemoScenario, ...DemoScenario[]] } {
  if (input.scenarios.length === 0) {
    throw new PlanningEvaluationInvariantError(
      "evaluateExecutiveWorkspaceMeasures requires at least one scenario; use resolvePlanningEvaluation first."
    );
  }
  const active = resolveActiveScenario(input.scenarios, input.activeScenarioId);
  if (!active) {
    throw new PlanningEvaluationInvariantError(
      "evaluateExecutiveWorkspaceMeasures could not resolve active scenario."
    );
  }
}
