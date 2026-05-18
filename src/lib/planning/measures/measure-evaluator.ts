/**
 * Shared evaluation facade (Phase 2 naming).
 * Delegates to orchestrators — engines stay untouched.
 */

import { evaluateEconomicsGraph } from "@/lib/platform-economics/evaluation";
import type { EvaluateEconomicsGraphInput } from "@/lib/platform-economics/evaluation";
import type { PlanningContext } from "./planning-context";
import type { EvaluateExecutiveWorkspaceMeasuresOptions } from "./executive-workspace-measures";

export function evaluatePlanningMeasures(
  context: PlanningContext,
  options?: EvaluateExecutiveWorkspaceMeasuresOptions
) {
  return evaluateEconomicsGraph({ ...context, ...options }).measures;
}

export { evaluateEconomicsGraph };
export type { EvaluateEconomicsGraphInput, EconomicsGraphResult } from "@/lib/platform-economics/evaluation";
