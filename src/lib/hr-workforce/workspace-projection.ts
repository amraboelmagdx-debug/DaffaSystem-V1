import {
  deriveHrWorkforceModel,
  type HrWorkforceDerived,
} from "@/lib/hr-workforce/selectors";

/** Input bundle for workforce economics (same shape as the engine selector). */
export type HrWorkforceProjectionInput = Parameters<typeof deriveHrWorkforceModel>[0];

/**
 * Canonical workforce economics projection for dashboards, exports, KPIs, and intelligence.
 * Thin wrapper over `deriveHrWorkforceModel` so all surfaces share one import path and tests
 * can assert parity if the engine is split later.
 */
export function deriveWorkspaceProjection(
  input: HrWorkforceProjectionInput
): HrWorkforceDerived {
  return deriveHrWorkforceModel(input);
}

export type { HrWorkforceDerived };
