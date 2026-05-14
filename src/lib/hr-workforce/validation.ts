import type { EmploymentType, JobRole } from "@/types/hr-workforce";

const EMPLOYMENT: EmploymentType[] = [
  "full_time",
  "part_time",
  "contractor",
  "freelancer",
];

export function parseEmploymentType(raw: string): EmploymentType | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, EmploymentType> = {
    full_time: "full_time",
    fulltime: "full_time",
    "full-time": "full_time",
    part_time: "part_time",
    parttime: "part_time",
    "part-time": "part_time",
    contractor: "contractor",
    freelancer: "freelancer",
  };
  if (EMPLOYMENT.includes(s as EmploymentType)) return s as EmploymentType;
  return map[s] ?? null;
}

export function parseBool(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1" || s === "y";
}

export interface RoleValidationIssue {
  field: string;
  message: string;
}

export function validateJobRole(role: Partial<JobRole>): RoleValidationIssue[] {
  const issues: RoleValidationIssue[] = [];
  if (!role.name?.trim()) issues.push({ field: "name", message: "Role name is required" });
  if (!role.departmentId) issues.push({ field: "departmentId", message: "Department is required" });
  if (role.employeeCount == null || role.employeeCount < 0)
    issues.push({ field: "employeeCount", message: "Employee count must be >= 0" });
  if (role.avgMonthlySalary != null && role.avgMonthlySalary < 0)
    issues.push({ field: "avgMonthlySalary", message: "Salary cannot be negative" });
  if (role.riskFactorPct != null && role.riskFactorPct < 0)
    issues.push({ field: "riskFactorPct", message: "Risk factor cannot be negative" });
  return issues;
}
