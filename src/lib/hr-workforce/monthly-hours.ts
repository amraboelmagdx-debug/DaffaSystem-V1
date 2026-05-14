import type { HrGlobalSettings } from "@/types/hr-workforce";

/**
 * Monthly working hours for costing (per employee, before utilization).
 * Formula: Working Days Per Week × Working Hours Per Day × weeksPerYear / 12
 */
export function monthlyWorkingHoursPerEmployee(settings: HrGlobalSettings): number {
  const d = Math.max(1, settings.workingDaysPerWeek);
  const h = Math.max(0.5, settings.workingHoursPerDay);
  const w = Math.max(1, settings.weeksPerYear);
  return (d * h * w) / 12;
}
