"use client";

import { useMemo } from "react";
import {
  compareCanonicalOutputs,
  type ReconciliationReport,
} from "@/lib/planning/reconciliation/compare-canonical-outputs";
import type { SalesPlanModel } from "@/lib/sales-plan/build-model";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";
import type { IncentiveSnapshot } from "@/types/incentives";

export function useNumericReconciliation(input: {
  salesPlanModel: SalesPlanModel | null;
  executiveMeasures: ExecutiveWorkspaceMeasuresResult | null;
  wizardNpTargetPct: number | null;
  wizardBlendedCm: number | null;
  incentiveSnapshot: IncentiveSnapshot | null;
  forecastProjectedPoolSar?: number | null;
  forecastAttainmentPct?: number | null;
}): ReconciliationReport {
  return useMemo(
    () => compareCanonicalOutputs(input),
    [
      input.salesPlanModel,
      input.executiveMeasures,
      input.wizardNpTargetPct,
      input.wizardBlendedCm,
      input.incentiveSnapshot,
      input.forecastProjectedPoolSar,
      input.forecastAttainmentPct,
    ]
  );
}
