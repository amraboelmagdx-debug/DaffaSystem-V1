import type { JobRole, OhManualSettings } from "@/types/hr-workforce";
import { newHrId } from "./id";
import { DEFAULT_OH } from "./default-oh";

export type DemoWorkforceSeedResult =
  | { ok: true; rolesAdded: number }
  | { ok: false; reason: "has_active_roles" | "no_business_unit" };

/** Narrow API so this module stays decoupled from the Zustand store shape. */
export interface DemoWorkforceSeedActions {
  roles: JobRole[];
  businessUnits: { id: string }[];
  departments: { id: string; businessUnitId: string; name: string }[];
  teams: { id: string; departmentId: string; name: string }[];
  defaultCurrency: string;
  ohManualForPrimaryBu: OhManualSettings | undefined;
  addDepartment: (businessUnitId: string, name: string) => { id: string; businessUnitId: string; name: string };
  addTeam: (departmentId: string, name: string) => { id: string; departmentId: string; name: string };
  addRole: (partial: Partial<Omit<JobRole, "id">> & { departmentId: string }) => void;
  setOhManualForBusinessUnit: (businessUnitId: string, patch: Partial<OhManualSettings>) => void;
}

/**
 * Populates illustrative roles, a delivery department + team, and composed OH lines
 * when the workspace has no active (non-archived) roles.
 */
export function seedDemoWorkforceIfEmpty(api: DemoWorkforceSeedActions): DemoWorkforceSeedResult {
  if (api.roles.some((r) => !r.archived)) return { ok: false, reason: "has_active_roles" };
  const buId = api.businessUnits[0]?.id;
  if (!buId) return { ok: false, reason: "no_business_unit" };

  const generalDept = api.departments.find((d) => d.businessUnitId === buId);
  if (!generalDept) return { ok: false, reason: "no_business_unit" };

  let deliveryDeptId = api.departments.find(
    (d) => d.businessUnitId === buId && d.name === "Client Delivery"
  )?.id;
  if (!deliveryDeptId) {
    deliveryDeptId = api.addDepartment(buId, "Client Delivery").id;
  }

  let squadTeamId = api.teams.find((t) => t.departmentId === deliveryDeptId && t.name === "Squad A")?.id;
  if (!squadTeamId) {
    squadTeamId = api.addTeam(deliveryDeptId, "Squad A").id;
  }

  const cur = api.defaultCurrency;

  const roleRows: Array<Partial<Omit<JobRole, "id">> & { departmentId: string }> = [
    {
      name: "Senior Consultant",
      departmentId: deliveryDeptId,
      businessUnitId: buId,
      teamId: squadTeamId,
      operationalRoleType: "delivery",
      employmentType: "full_time",
      employeeCount: 6,
      currency: cur,
      avgMonthlySalary: 22_000,
      avgMonthlySocialInsurance: 2500,
      annualMedicalInsurance: 6000,
      annualEndOfServiceCost: 18_000,
      riskFactorPct: 0,
      isBillable: true,
      includeInOhAllocation: true,
      additionalCosts: [],
    },
    {
      name: "Consultant",
      departmentId: deliveryDeptId,
      businessUnitId: buId,
      teamId: squadTeamId,
      operationalRoleType: "delivery",
      employmentType: "full_time",
      employeeCount: 14,
      currency: cur,
      avgMonthlySalary: 14_500,
      avgMonthlySocialInsurance: 1800,
      annualMedicalInsurance: 4800,
      annualEndOfServiceCost: 12_000,
      riskFactorPct: 0,
      isBillable: true,
      includeInOhAllocation: true,
      additionalCosts: [],
    },
    {
      name: "Delivery Lead",
      departmentId: deliveryDeptId,
      businessUnitId: buId,
      teamId: squadTeamId,
      operationalRoleType: "delivery",
      employmentType: "full_time",
      employeeCount: 3,
      currency: cur,
      avgMonthlySalary: 28_000,
      avgMonthlySocialInsurance: 3200,
      annualMedicalInsurance: 8000,
      annualEndOfServiceCost: 24_000,
      riskFactorPct: 5,
      isBillable: true,
      includeInOhAllocation: true,
      additionalCosts: [],
    },
    {
      name: "Engineering Manager",
      departmentId: deliveryDeptId,
      businessUnitId: buId,
      teamId: squadTeamId,
      operationalRoleType: "indirect",
      employmentType: "full_time",
      employeeCount: 2,
      currency: cur,
      avgMonthlySalary: 32_000,
      avgMonthlySocialInsurance: 3600,
      annualMedicalInsurance: 9000,
      annualEndOfServiceCost: 26_000,
      riskFactorPct: 0,
      isBillable: false,
      includeInOhAllocation: true,
      additionalCosts: [],
    },
    {
      name: "HR Coordinator",
      departmentId: generalDept.id,
      businessUnitId: buId,
      teamId: undefined,
      operationalRoleType: "indirect",
      employmentType: "full_time",
      employeeCount: 2,
      currency: cur,
      avgMonthlySalary: 11_000,
      avgMonthlySocialInsurance: 1200,
      annualMedicalInsurance: 3000,
      annualEndOfServiceCost: 9000,
      riskFactorPct: 0,
      isBillable: false,
      includeInOhAllocation: true,
      additionalCosts: [],
    },
    {
      name: "Finance Manager",
      departmentId: generalDept.id,
      businessUnitId: buId,
      teamId: undefined,
      operationalRoleType: "indirect",
      employmentType: "full_time",
      employeeCount: 1,
      currency: cur,
      avgMonthlySalary: 26_000,
      avgMonthlySocialInsurance: 2800,
      annualMedicalInsurance: 7000,
      annualEndOfServiceCost: 20_000,
      riskFactorPct: 0,
      isBillable: false,
      includeInOhAllocation: true,
      additionalCosts: [],
    },
    {
      name: "Office Administrator",
      departmentId: generalDept.id,
      businessUnitId: buId,
      teamId: undefined,
      operationalRoleType: "indirect",
      employmentType: "full_time",
      employeeCount: 2,
      currency: cur,
      avgMonthlySalary: 8500,
      avgMonthlySocialInsurance: 900,
      annualMedicalInsurance: 2400,
      annualEndOfServiceCost: 7000,
      riskFactorPct: 0,
      isBillable: false,
      includeInOhAllocation: true,
      additionalCosts: [],
    },
  ];

  for (const row of roleRows) {
    api.addRole(row);
  }

  const mergedBase: OhManualSettings = { ...DEFAULT_OH, ...(api.ohManualForPrimaryBu ?? {}) };
  api.setOhManualForBusinessUnit(buId, {
    ...mergedBase,
    utilizationRatePct: 78,
    billableFteSource: "from_roles",
    useComposedAnnualOh: true,
    totalAnnualOverhead: 320_000,
    ohNonWorkforceLines: [
      {
        id: newHrId("ohline"),
        name: "Office rent",
        amount: 420_000,
        recurring: "yearly",
        active: true,
        category: "Facilities",
      },
      {
        id: newHrId("ohline"),
        name: "Microsoft 365 / SaaS",
        amount: 18_000,
        recurring: "yearly",
        active: true,
        category: "IT",
      },
      {
        id: newHrId("ohline"),
        name: "Legal retainer",
        amount: 6000,
        recurring: "monthly",
        active: true,
        category: "Legal",
      },
      {
        id: newHrId("ohline"),
        name: "Utilities",
        amount: 2800,
        recurring: "monthly",
        active: true,
        category: "Facilities",
      },
      {
        id: newHrId("ohline"),
        name: "Cloud hosting",
        amount: 4500,
        recurring: "monthly",
        active: true,
        category: "Infrastructure",
      },
    ],
  });

  return { ok: true, rolesAdded: roleRows.length };
}
