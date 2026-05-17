import type {
  EmploymentType,
  JobRole,
  JobRoleAdditionalCost,
  PercentageCostBasis,
} from "@/types/hr-workforce";
import { newHrId } from "./id";
import { legacyFlagsForOperationalRoleType } from "./role-operational-type";
import { parseBool, parseEmploymentType, validateJobRole } from "./validation";

export type ImportColumnKey =
  | "holding"
  | "businessUnit"
  | "department"
  | "team"
  | "roleName"
  | "employmentType"
  | "employeeCount"
  | "monthlySalary"
  | "monthlySocialInsurance"
  | "annualMedicalInsurance"
  | "annualEosCost"
  | "riskFactorPct"
  | "isBillable"
  | "additionalCosts";

export const IMPORT_COLUMN_LABELS: Record<ImportColumnKey, string> = {
  holding: "Holding",
  businessUnit: "Business Unit",
  department: "Department",
  team: "Team",
  roleName: "Role Name",
  employmentType: "Employment Type",
  employeeCount: "Employee Count",
  monthlySalary: "Monthly Salary",
  monthlySocialInsurance: "Monthly Social Insurance",
  annualMedicalInsurance: "Annual Medical Insurance",
  annualEosCost: "Annual EOS Cost",
  riskFactorPct: "Risk Factor %",
  isBillable: "Is Billable",
  additionalCosts: "Additional Costs",
};

export interface ParsedImportRow {
  rowIndex: number;
  values: Record<string, string>;
}

function num(raw: string, def = 0): number {
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : def;
}

function mapPercentageBasis(raw: string | undefined): PercentageCostBasis | undefined {
  if (!raw) return "salary_plus_benefits";
  const s = raw.toLowerCase().replace(/-/g, "_");
  const legacy: Record<string, PercentageCostBasis> = {
    pre_risk_monthly_base: "salary_plus_benefits",
    salary_only: "salary_only",
    salary_plus_benefits: "salary_plus_benefits",
    subtotal_before_risk: "subtotal_before_risk",
    loaded_cost: "loaded_cost",
    custom: "custom",
  };
  return legacy[s] ?? "salary_plus_benefits";
}

/** Optional "Name:100:fixed:monthly[:basis]" — basis only for percentage rows. */
export function parseAdditionalCostsCell(raw: string): JobRoleAdditionalCost[] {
  if (!raw?.trim()) return [];
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  const out: JobRoleAdditionalCost[] = [];
  for (const p of parts) {
    const seg = p.split(":").map((s) => s.trim());
    const name = seg[0] ?? "Additional";
    const amount = num(seg[1] ?? "0", 0);
    const costType = (seg[2]?.toLowerCase() === "percentage"
      ? "percentage"
      : seg[2]?.toLowerCase() === "variable"
        ? "variable"
        : "fixed") as JobRoleAdditionalCost["costType"];
    const recurring = (seg[3]?.toLowerCase() === "yearly"
      ? "yearly"
      : seg[3]?.toLowerCase() === "one_time" || seg[3]?.toLowerCase() === "onetime"
        ? "one_time"
        : "monthly") as JobRoleAdditionalCost["recurring"];
    const percentageBasis =
      costType === "percentage" ? mapPercentageBasis(seg[4]) : undefined;
    out.push({
      id: newHrId("cost"),
      costName: name,
      amount,
      costType,
      recurring,
      percentageBasis,
    });
  }
  return out;
}

export interface MapRowToRoleParams {
  row: ParsedImportRow;
  columnMap: Partial<Record<ImportColumnKey, string>>;
  /** Resolve department; optional BU name scopes new departments under the correct unit in dry-run. */
  resolveDepartment: (args: { departmentName: string; businessUnitName?: string }) => {
    departmentId: string;
    businessUnitId: string;
  } | null;
  resolveTeamId: (deptId: string, name: string) => string | null;
  defaultCurrency: string;
}

export function getCell(row: ParsedImportRow, header: string | undefined): string {
  if (!header) return "";
  return row.values[header] ?? "";
}

export function mapRowToJobRole(p: MapRowToRoleParams): JobRole | null {
  const { row, columnMap, resolveDepartment, resolveTeamId, defaultCurrency } = p;
  const buCell = columnMap.businessUnit ? getCell(row, columnMap.businessUnit).trim() : "";
  const deptName = getCell(row, columnMap.department).trim();
  const teamName = getCell(row, columnMap.team).trim();

  const resolved = resolveDepartment({
    departmentName: deptName,
    businessUnitName: buCell || undefined,
  });
  if (!resolved) return null;

  const etRaw = getCell(row, columnMap.employmentType);
  const et: EmploymentType = parseEmploymentType(etRaw) ?? "full_time";

  const teamId = teamName ? resolveTeamId(resolved.departmentId, teamName) : null;

  const billable = parseBool(getCell(row, columnMap.isBillable));
  const operationalRoleType: "delivery" | "indirect" = billable ? "delivery" : "indirect";
  const typeFlags = legacyFlagsForOperationalRoleType(operationalRoleType);

  const role: JobRole = {
    id: newHrId("role"),
    businessUnitId: resolved.businessUnitId,
    departmentId: resolved.departmentId,
    teamId: teamId ?? undefined,
    name: getCell(row, columnMap.roleName).trim() || `Role row ${row.rowIndex}`,
    employmentType: et,
    employeeCount: Math.max(0, Math.floor(num(getCell(row, columnMap.employeeCount), 0))),
    currency: defaultCurrency,
    avgMonthlySalary: num(getCell(row, columnMap.monthlySalary), 0),
    avgMonthlySocialInsurance: num(getCell(row, columnMap.monthlySocialInsurance), 0),
    annualMedicalInsurance: num(getCell(row, columnMap.annualMedicalInsurance), 0),
    annualEndOfServiceCost: num(getCell(row, columnMap.annualEosCost), 0),
    riskFactorPct: num(getCell(row, columnMap.riskFactorPct), 0),
    ...typeFlags,
    operationalRoleType,
    additionalCosts: parseAdditionalCostsCell(getCell(row, columnMap.additionalCosts)),
  };
  return role;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

type HeaderMatchRule = {
  exact?: string[];
  includes?: string[];
  excludes?: string[];
};

/** Picks the best sheet column for a logical import field (exact match, then substring). */
export function matchImportHeader(
  headers: string[],
  rule: HeaderMatchRule
): string | undefined {
  let best: { header: string; score: number } | null = null;
  for (const header of headers) {
    const n = normalizeHeader(header);
    if (rule.excludes?.some((ex) => n.includes(ex))) continue;
    let score = 0;
    for (const e of rule.exact ?? []) {
      if (n === e) score = Math.max(score, 100);
    }
    for (const inc of rule.includes ?? []) {
      if (n.includes(inc)) score = Math.max(score, 60);
    }
    if (score > 0 && (!best || score > best.score)) best = { header, score };
  }
  return best?.header;
}

export function guessColumnMap(headers: string[]): Partial<Record<ImportColumnKey, string>> {
  return {
    holding: matchImportHeader(headers, {
      exact: ["holding", "holding company", "organization", "organisation", "org", "tenant"],
      includes: ["holding company", "holding name"],
      excludes: ["business unit", "bu"],
    }),
    businessUnit: matchImportHeader(headers, {
      exact: ["business unit", "bu", "operating unit", "division"],
      includes: ["business unit", "operating unit"],
      excludes: ["holding"],
    }),
    department: matchImportHeader(headers, {
      exact: ["department", "dept"],
      includes: ["department", "dept"],
    }),
    team: matchImportHeader(headers, {
      exact: ["team", "squad", "group"],
      includes: ["team"],
      excludes: ["steam"],
    }),
    roleName: matchImportHeader(headers, {
      exact: ["role name", "role", "job role", "title", "position"],
      includes: ["role name", "job role", "position"],
      excludes: ["employment"],
    }),
    employmentType: matchImportHeader(headers, {
      exact: ["employment type", "employment", "contract type"],
      includes: ["employment type", "employment"],
    }),
    employeeCount: matchImportHeader(headers, {
      exact: ["employee count", "headcount", "employees", "fte", "count"],
      includes: ["headcount", "employee count", "fte"],
    }),
    monthlySalary: matchImportHeader(headers, {
      exact: ["monthly salary", "salary", "basic salary", "base salary"],
      includes: ["monthly salary", "salary"],
      excludes: ["social", "insurance"],
    }),
    monthlySocialInsurance: matchImportHeader(headers, {
      exact: ["monthly social insurance", "social insurance", "si", "gosi"],
      includes: ["social insurance", "gosi"],
    }),
    annualMedicalInsurance: matchImportHeader(headers, {
      exact: ["annual medical insurance", "medical insurance", "medical"],
      includes: ["medical"],
    }),
    annualEosCost: matchImportHeader(headers, {
      exact: ["annual eos cost", "annual eos", "eos cost", "eos", "end of service", "gratuity"],
      includes: ["eos", "end of service", "gratuity"],
    }),
    riskFactorPct: matchImportHeader(headers, {
      exact: ["risk factor %", "risk factor", "risk %", "risk pct"],
      includes: ["risk factor", "risk %"],
      excludes: ["additional"],
    }),
    isBillable: matchImportHeader(headers, {
      exact: ["is billable", "billable", "billable role"],
      includes: ["billable"],
    }),
    additionalCosts: matchImportHeader(headers, {
      exact: ["additional costs", "extras", "other costs"],
      includes: ["additional cost", "additional costs"],
    }),
  };
}

/** Fields that must be mapped for compensation import to be trustworthy. */
export const IMPORT_COMPENSATION_KEYS: ImportColumnKey[] = [
  "monthlySalary",
  "monthlySocialInsurance",
  "annualMedicalInsurance",
  "annualEosCost",
  "riskFactorPct",
  "additionalCosts",
];

export function listUnmappedImportKeys(
  columnMap: Partial<Record<ImportColumnKey, string>>
): ImportColumnKey[] {
  return IMPORT_COMPENSATION_KEYS.filter((k) => !columnMap[k]);
}

export { validateJobRole };
