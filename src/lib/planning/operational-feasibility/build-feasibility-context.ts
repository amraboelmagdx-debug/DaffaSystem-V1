import { deriveHrWorkforceModel } from "@/lib/hr-workforce/selectors";
import type { HrWorkforceSnapshot } from "@/types/operational-feasibility";

export type { HrWorkforceSnapshot };
import type { DemoCompany, DemoRevenueStream } from "@/types/domain";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import type { ScenarioBundleEvaluation } from "@/types/scenario-comparison";
import { evaluateScenarioBundle } from "@/lib/planning/scenario-comparison";
import type { DemoOpportunity } from "@/types/domain";

export type FeasibilityEvalContext = {
  company: DemoCompany;
  hrBusinessUnitId: string | null;
  hrSnapshot: HrWorkforceSnapshot;
  streams: DemoRevenueStream[];
  bundleEvaluation: ScenarioBundleEvaluation;
  baselineEvaluation?: ScenarioBundleEvaluation;
  serviceHoursByTemplateId: Record<string, number>;
  salesPlanLoadIndex: number | null;
};

export function buildFeasibilityEvalContext(input: {
  anchorCompany: DemoCompany;
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  bundle: ScenarioPlanningBundle;
  baselineBundle?: ScenarioPlanningBundle;
  hrSnapshot: HrWorkforceSnapshot;
  serviceHoursByTemplateId?: Record<string, number>;
  salesPlanLoadIndex?: number | null;
}): FeasibilityEvalContext {
  const companyStreams = input.streams.filter((s) => s.companyId === input.anchorCompany.id);
  const evalCommon = {
    anchorCompany: input.anchorCompany,
    streams: companyStreams,
    opportunities: input.opportunities,
  };

  const bundleEvaluation = evaluateScenarioBundle({ ...evalCommon, bundle: input.bundle });
  const baselineEvaluation = input.baselineBundle
    ? evaluateScenarioBundle({ ...evalCommon, bundle: input.baselineBundle })
    : undefined;

  const hrBusinessUnitId = input.anchorCompany.hrBusinessUnitId?.trim() || null;

  return {
    company: input.anchorCompany,
    hrBusinessUnitId,
    hrSnapshot: input.hrSnapshot,
    streams: companyStreams,
    bundleEvaluation,
    baselineEvaluation,
    serviceHoursByTemplateId: input.serviceHoursByTemplateId ?? {},
    salesPlanLoadIndex: input.salesPlanLoadIndex ?? null,
  };
}

export function getBuBillableSupplyHours(
  hrSnapshot: HrWorkforceSnapshot,
  hrBusinessUnitId: string
): { totalBillableHoursMonth: number; utilizationRatePct: number; deliveryHeadcount: number } | null {
  const derived = deriveHrWorkforceModel(hrSnapshot);
  const bundle = derived.ohByBusinessUnitId[hrBusinessUnitId];
  if (!bundle) return null;

  const deliveryHeadcount = hrSnapshot.roles
    .filter(
      (r) =>
        !r.archived &&
        r.businessUnitId === hrBusinessUnitId &&
        r.operationalRoleType === "delivery"
    )
    .reduce((s, r) => s + Math.max(0, r.employeeCount), 0);

  if (bundle.oh.totalBillableHoursPerMonth <= 0 && deliveryHeadcount <= 0) {
    return null;
  }

  const om = hrSnapshot.ohManualByBusinessUnitId[hrBusinessUnitId];
  return {
    totalBillableHoursMonth: bundle.oh.totalBillableHoursPerMonth,
    utilizationRatePct: om?.utilizationRatePct ?? 80,
    deliveryHeadcount,
  };
}
