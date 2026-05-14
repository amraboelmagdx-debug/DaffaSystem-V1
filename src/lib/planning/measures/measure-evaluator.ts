/**
 * Shared evaluation facade (Phase 2 naming).
 * Delegates to orchestrators — engines stay untouched.
 */

import type { PlanningContext } from "./planning-context";
import { evaluateExecutiveWorkspaceMeasures } from "./executive-workspace-measures";

export function evaluatePlanningMeasures(context: PlanningContext) {
  return evaluateExecutiveWorkspaceMeasures(context);
}
