import type {
  JobRole,
  JobRoleAdditionalCost,
  PercentageCostBasis,
  RoleCostBreakdown,
} from "@/types/hr-workforce";
import type { HrGlobalSettings } from "@/types/hr-workforce";
import { monthlyWorkingHoursPerEmployee } from "./monthly-hours";

const EPS = 1e-9;

function monthlyFromRecurring(amount: number, recurring: JobRoleAdditionalCost["recurring"]): number {
  switch (recurring) {
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    case "one_time":
      return amount / 12;
    default:
      return amount;
  }
}

function resolvePercentageBase(
  basis: PercentageCostBasis | undefined,
  ctx: {
    n: number;
    role: JobRole;
    monthlyBaseCost: number;
    nonPctMonthly: number;
  }
): number {
  const b = basis ?? "salary_plus_benefits";
  switch (b) {
    case "salary_only":
      return Math.max(0, ctx.role.avgMonthlySalary * ctx.n);
    case "salary_plus_benefits":
      return ctx.monthlyBaseCost;
    case "subtotal_before_risk":
    case "loaded_cost":
      return ctx.monthlyBaseCost + ctx.nonPctMonthly;
    case "custom":
    default:
      return ctx.monthlyBaseCost;
  }
}

/** Sum non-percentage additional rows as monthly equivalents, per employee, then × headcount (aligned with salary/SI fields). */
export function monthlyNonPercentageAdditionalCosts(role: JobRole): number {
  const n = Math.max(0, Math.floor(role.employeeCount));
  const costs = role.additionalCosts ?? [];
  let sum = 0;
  for (const c of costs) {
    if (c.costType !== "percentage") {
      sum += monthlyFromRecurring(c.amount, c.recurring) * n;
    }
  }
  return sum;
}

/** Sum additional cost rows into a monthly add-on for the role (pre-risk). */
export function monthlyAdditionalCostsForRole(role: JobRole, monthlyBaseCost: number): number {
  const n = Math.max(0, Math.floor(role.employeeCount));
  const costs = role.additionalCosts ?? [];
  const nonPctMonthly = monthlyNonPercentageAdditionalCosts(role);
  let sum = nonPctMonthly;
  for (const c of costs) {
    if (c.costType === "percentage") {
      const base = resolvePercentageBase(c.percentageBasis, {
        n,
        role,
        monthlyBaseCost,
        nonPctMonthly,
      });
      const pct = Math.max(0, c.amount) / 100;
      sum += base * pct;
    }
  }
  return sum;
}

/**
 * Per-role workforce costs. Direct labor uses stable monthly hours × headcount denominator
 * for hourly rate (does not bake utilization into direct rate — utilization reserved for OH path).
 */
export function computeRoleCostBreakdown(
  role: JobRole,
  settings: HrGlobalSettings,
  ohRatePerHour: number,
  options?: { zeroOutOhSurcharge?: boolean }
): RoleCostBreakdown {
  const effectiveOhRate = options?.zeroOutOhSurcharge ? 0 : ohRatePerHour;
  const n = Math.max(0, Math.floor(role.employeeCount));
  const perEmployeeMonthlyBase =
    role.avgMonthlySalary +
    role.avgMonthlySocialInsurance +
    role.annualMedicalInsurance / 12 +
    role.annualEndOfServiceCost / 12;

  const monthlyBaseCost = perEmployeeMonthlyBase * n;

  const monthlyAdditionalCosts = monthlyAdditionalCostsForRole(role, monthlyBaseCost);

  const monthlySubtotalBeforeRisk = monthlyBaseCost + monthlyAdditionalCosts;

  const riskMult = 1 + Math.max(0, role.riskFactorPct) / 100;
  const monthlyTotalCost = monthlySubtotalBeforeRisk * riskMult;

  const annualTotalCost = monthlyTotalCost * 12;

  const mh = monthlyWorkingHoursPerEmployee(settings);
  const roleMonthlyHours = Math.max(EPS, mh * n);
  const standardHourlyCost = monthlyTotalCost / roleMonthlyHours;

  const ohAdjustedHourlyCost = standardHourlyCost + effectiveOhRate;

  return {
    roleId: role.id,
    monthlyBaseCost,
    monthlyAdditionalCosts,
    monthlySubtotalBeforeRisk,
    monthlyTotalCost,
    annualTotalCost,
    standardHourlyCost,
    ohAdjustedHourlyCost,
  };
}

export function computeAllRoleBreakdowns(
  roles: JobRole[],
  settings: HrGlobalSettings,
  getOhRateForRole: (role: JobRole) => number,
  options?: { skipOhSurchargeOnNonBillable?: (role: JobRole) => boolean }
): RoleCostBreakdown[] {
  return roles
    .filter((r) => !r.archived)
    .map((r) =>
      computeRoleCostBreakdown(r, settings, getOhRateForRole(r), {
        zeroOutOhSurcharge: options?.skipOhSurchargeOnNonBillable?.(r) ?? false,
      })
    );
}
