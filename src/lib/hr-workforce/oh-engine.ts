import type { OhComputationInputs, OhEngineResult } from "@/types/hr-workforce";

const EPS = 1e-9;

/**
 * OH Rate engine — methodology as specified (manual billable headcount & overhead).
 *
 * 1) Total annual hours / employee = days/week × hours/day × weeks/year
 * 2) Off hours = off days × hours/day (per employee year)
 * 3) Net available hours / employee / year = (1) − (2)
 * 4) Total billable hours / year = net × utilization × billable employees
 * 5) OH rate = total annual overhead / total billable hours
 */
export function computeOhEngine(inputs: OhComputationInputs): OhEngineResult {
  const weeks = Math.max(1, inputs.weeksPerYear);
  const totalAnnualHoursPerEmployee =
    inputs.workingDaysPerWeek * inputs.workingHoursPerDay * weeks;

  const offHoursPerEmployeeYear = inputs.offDaysPerYear * inputs.workingHoursPerDay;

  const netAvailableHoursPerEmployeeYear = Math.max(
    0,
    totalAnnualHoursPerEmployee - offHoursPerEmployeeYear
  );

  const util = Math.min(1, Math.max(0, inputs.utilizationRatePct / 100));
  const billable = Math.max(0, inputs.billableEmployeeCount);

  const totalBillableHoursPerYear = netAvailableHoursPerEmployeeYear * util * billable;

  const ohRatePerHour =
    totalBillableHoursPerYear > EPS ? inputs.totalAnnualOverhead / totalBillableHoursPerYear : 0;

  return {
    totalAnnualHoursPerEmployee,
    offHoursPerEmployeeYear,
    netAvailableHoursPerEmployeeYear,
    totalBillableHoursPerYear,
    totalBillableHoursPerMonth: totalBillableHoursPerYear / 12,
    ohRatePerHour,
    effectiveBillableEmployeeCount: billable,
  };
}
