import type { ColumnSpec } from "@/lib/import-engine/types";

export const HR_SHEET_NAMES = {
  businessUnits: "Business Units",
  departments: "Departments",
  teams: "Teams",
  roles: "Roles",
  globalSettings: "Global Settings",
  ohManual: "OH Manual",
  ohLines: "OH Non-Workforce Lines",
} as const;

export const HR_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contractor",
  "freelancer",
] as const;

export const HR_OPERATIONAL_ROLE_TYPES = ["delivery", "indirect"] as const;

export const HR_OH_FTE_SOURCES = ["manual", "from_roles"] as const;

export const HR_OH_LINE_RECURRING = ["monthly", "yearly"] as const;

export const businessUnitColumns: ColumnSpec[] = [
  {
    key: "id",
    label: "Id (leave blank for new)",
    help: "Optional. Paste the existing id to update, otherwise leave blank.",
  },
  { key: "name", label: "Name", required: true, example: "ZAN" },
  { key: "code", label: "Code", example: "ZAN" },
  { key: "description", label: "Description", example: "Saudi delivery unit" },
  {
    key: "isActive",
    label: "Active",
    enumValues: ["true", "false"],
    example: "true",
    help: "Use true/false. Inactive units are kept but hidden from operational views.",
  },
];

export const departmentColumns: ColumnSpec[] = [
  {
    key: "businessUnitName",
    label: "Business Unit",
    required: true,
    example: "ZAN",
    help: "Must match a name in the Business Units sheet or reference sheet.",
  },
  { key: "id", label: "Id (leave blank for new)" },
  { key: "name", label: "Department name", required: true, example: "Engineering" },
  { key: "code", label: "Code", example: "ENG" },
  {
    key: "isActive",
    label: "Active",
    enumValues: ["true", "false"],
    example: "true",
  },
];

export const teamColumns: ColumnSpec[] = [
  { key: "businessUnitName", label: "Business Unit", required: true, example: "ZAN" },
  {
    key: "departmentName",
    label: "Department",
    required: true,
    example: "Engineering",
  },
  { key: "id", label: "Id (leave blank for new)" },
  { key: "name", label: "Team name", required: true, example: "Platform" },
];

export const roleColumns: ColumnSpec[] = [
  { key: "businessUnitName", label: "Business Unit", required: true, example: "ZAN" },
  { key: "departmentName", label: "Department", required: true, example: "Engineering" },
  { key: "teamName", label: "Team", example: "Platform" },
  { key: "id", label: "Id (leave blank for new)" },
  { key: "name", label: "Role name", required: true, example: "Senior Engineer" },
  {
    key: "employmentType",
    label: "Employment type",
    required: true,
    enumValues: [...HR_EMPLOYMENT_TYPES],
    example: "full_time",
  },
  {
    key: "operationalRoleType",
    label: "Operational role type",
    required: true,
    enumValues: [...HR_OPERATIONAL_ROLE_TYPES],
    example: "delivery",
    help: "delivery = billable / counted in OH FTE; indirect = overhead workforce.",
  },
  { key: "employeeCount", label: "Employee count", required: true, example: 3 },
  { key: "currency", label: "Currency", example: "SAR" },
  { key: "avgMonthlySalary", label: "Monthly salary", example: 18000 },
  {
    key: "avgMonthlySocialInsurance",
    label: "Monthly social insurance",
    example: 1200,
  },
  {
    key: "annualMedicalInsurance",
    label: "Annual medical insurance",
    example: 6000,
  },
  { key: "annualEndOfServiceCost", label: "Annual EOS cost", example: 24000 },
  { key: "riskFactorPct", label: "Risk factor %", example: 5 },
  {
    key: "isBillable",
    label: "Is billable",
    enumValues: ["true", "false"],
    example: "true",
  },
  {
    key: "includeInOhAllocation",
    label: "Include in OH allocation",
    enumValues: ["true", "false"],
    example: "true",
  },
  {
    key: "archived",
    label: "Archived",
    enumValues: ["true", "false"],
    example: "false",
  },
  {
    key: "additionalCosts",
    label: "Additional costs",
    help: 'Pipe-separated: "Name:Amount:fixed|percentage|variable:monthly|yearly|one_time[:basis]"',
    example: "Laptop fund:500:fixed:monthly",
  },
];

export const globalSettingsColumns: ColumnSpec[] = [
  { key: "workingDaysPerWeek", label: "Working days per week", required: true, example: 5 },
  { key: "workingHoursPerDay", label: "Working hours per day", required: true, example: 8 },
  { key: "weeksPerYear", label: "Weeks per year", required: true, example: 52 },
  { key: "offDaysPerYear", label: "Off days per year", required: true, example: 30 },
  { key: "defaultCurrency", label: "Default currency", required: true, example: "SAR" },
  {
    key: "useTeamLevel",
    label: "Use team level",
    enumValues: ["true", "false"],
    example: "true",
  },
];

export const ohManualColumns: ColumnSpec[] = [
  {
    key: "businessUnitName",
    label: "Business Unit",
    required: true,
    example: "ZAN",
  },
  {
    key: "utilizationRatePct",
    label: "Utilization rate %",
    required: true,
    example: 80,
  },
  {
    key: "billableEmployeeCount",
    label: "Billable employee count (manual)",
    example: 10,
  },
  { key: "totalAnnualOverhead", label: "Total annual overhead", example: 500000 },
  {
    key: "billableFteSource",
    label: "Billable FTE source",
    enumValues: [...HR_OH_FTE_SOURCES],
    example: "manual",
    help: "manual = use the value above; from_roles = sum delivery role headcount.",
  },
  {
    key: "useComposedAnnualOh",
    label: "Use composed annual OH",
    enumValues: ["true", "false"],
    example: "false",
    help: "When true, OH numerator = indirect workforce + non-workforce lines + total above.",
  },
];

export const ohLineColumns: ColumnSpec[] = [
  {
    key: "businessUnitName",
    label: "Business Unit",
    required: true,
    example: "ZAN",
  },
  { key: "id", label: "Id (leave blank for new)" },
  { key: "name", label: "Line name", required: true, example: "Office rent" },
  { key: "category", label: "Category", example: "Facilities" },
  { key: "amount", label: "Amount", required: true, example: 25000 },
  {
    key: "recurring",
    label: "Recurring",
    enumValues: [...HR_OH_LINE_RECURRING],
    example: "monthly",
  },
  {
    key: "active",
    label: "Active",
    enumValues: ["true", "false"],
    example: "true",
  },
  { key: "notes", label: "Notes" },
];
