import type { IncentivePlan, IncentivePlanStatus } from "@/types/incentives";

export type IncentivePlanRow = {
  id: string;
  organization_id: string;
  hr_business_unit_id: string;
  company_id: string | null;
  version: number;
  status: string;
  plan_json: IncentivePlan;
  created_at: string;
  updated_at: string;
};

export function planToRow(plan: IncentivePlan, organizationId: string): Omit<IncentivePlanRow, "created_at" | "updated_at"> {
  return {
    id: plan.id,
    organization_id: organizationId,
    hr_business_unit_id: plan.hrBusinessUnitId,
    company_id: plan.companyId ?? null,
    version: plan.version,
    status: plan.status,
    plan_json: { ...plan, organizationId },
  };
}

export function rowToPlan(row: IncentivePlanRow): IncentivePlan {
  const plan = row.plan_json;
  return {
    ...plan,
    id: row.id,
    organizationId: row.organization_id,
    hrBusinessUnitId: row.hr_business_unit_id,
    companyId: row.company_id ?? plan.companyId,
    version: row.version,
    status: row.status as IncentivePlanStatus,
  };
}

export function buildDedupeKey(input: {
  planId: string;
  planVersion: number;
  periodYear: number;
  mode: string;
  inputHash: string;
}): string {
  return `${input.planId}:v${input.planVersion}:${input.periodYear}:${input.mode}:${input.inputHash}`;
}
