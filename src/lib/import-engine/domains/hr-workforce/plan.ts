import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  JobRoleAdditionalCost,
  OhManualSettings,
  OhNonWorkforceLine,
} from "@/types/hr-workforce";
import type { HrEngineImportDeltas } from "@/stores/hr-workforce/hr-workforce-store-types";
import { newHrId } from "@/lib/hr-workforce/id";
import { legacyFlagsForOperationalRoleType } from "@/lib/hr-workforce/role-operational-type";
import {
  parseAdditionalCostsCell,
  type ParsedImportRow,
} from "@/lib/hr-workforce/import-parser";
import { nowIso } from "@/lib/hr-workforce/structure-utils";
import {
  bool,
  ciKey,
  num,
} from "@/lib/import-engine/normalize";
import { findSheet } from "@/lib/import-engine/workbook";
import {
  issue,
  makeIdIndex,
  makeNameIndex,
} from "@/lib/import-engine/dry-run";
import type {
  ImportChangeSummaryRow,
  ImportIssue,
  ImportPlanResult,
  ParsedSheet,
  ParsedWorkbook,
} from "@/lib/import-engine/types";
import {
  HR_EMPLOYMENT_TYPES,
  HR_OH_FTE_SOURCES,
  HR_OH_LINE_RECURRING,
  HR_OPERATIONAL_ROLE_TYPES,
  HR_SHEET_NAMES,
} from "./columns";
import type { HrSnapshot } from "./snapshot";

interface RowEnv {
  sheet: ParsedSheet;
  row: ParsedImportRow;
  issues: ImportIssue[];
}

function getNumericField(env: RowEnv, header: string, def = 0): number {
  return num(env.row.values[header] ?? "", def);
}

function getBoolField(env: RowEnv, header: string, def = false): boolean {
  return bool(env.row.values[header] ?? "", def);
}

function getStringField(env: RowEnv, header: string): string {
  return (env.row.values[header] ?? "").trim();
}

/** Find the actual workbook header for a column key (matches "Label" and "Label *"). */
function resolveHeader(sheet: ParsedSheet, label: string): string | undefined {
  const target = ciKey(label);
  return sheet.headers.find((h) => {
    const norm = ciKey(h.replace(/\*$/, "").trim());
    return norm === target;
  });
}

function getHeaderResolver(sheet: ParsedSheet) {
  const cache = new Map<string, string | undefined>();
  return (label: string): string | undefined => {
    if (cache.has(label)) return cache.get(label);
    const found = resolveHeader(sheet, label);
    cache.set(label, found);
    return found;
  };
}

function emptyDeltas(): HrEngineImportDeltas {
  return { businessUnits: [], departments: [], teams: [], roles: [] };
}

interface Indices {
  buById: Map<string, HrBusinessUnit>;
  buByName: Map<string, HrBusinessUnit>;
  deptById: Map<string, HrDepartment>;
  deptByNamePerBu: Map<string, HrDepartment>;
  teamById: Map<string, HrTeam>;
  teamByNamePerDept: Map<string, HrTeam>;
  roleById: Map<string, JobRole>;
}

function buildIndices(snapshot: HrSnapshot): Indices {
  const buById = makeIdIndex(snapshot.businessUnits);
  const buByName = makeNameIndex(snapshot.businessUnits);
  const deptById = makeIdIndex(snapshot.departments);
  const deptByNamePerBu = new Map<string, HrDepartment>();
  for (const d of snapshot.departments) {
    deptByNamePerBu.set(`${d.businessUnitId}::${ciKey(d.name)}`, d);
  }
  const teamById = makeIdIndex(snapshot.teams);
  const teamByNamePerDept = new Map<string, HrTeam>();
  for (const t of snapshot.teams) {
    teamByNamePerDept.set(`${t.departmentId}::${ciKey(t.name)}`, t);
  }
  const roleById = makeIdIndex(snapshot.roles);
  return {
    buById,
    buByName,
    deptById,
    deptByNamePerBu,
    teamById,
    teamByNamePerDept,
    roleById,
  };
}

interface PlanState extends Indices {
  /** Working map per BU: businessUnitName ciKey → unit (existing or new from this import). */
  workingBuByName: Map<string, HrBusinessUnit>;
  /** Per-BU department maps for lookups after insertions. */
  workingDeptByNamePerBu: Map<string, HrDepartment>;
  /** Per-Department team maps. */
  workingTeamByNamePerDept: Map<string, HrTeam>;
  /** Net deltas to emit. */
  deltas: HrEngineImportDeltas;
  /** Per-entity counters for the summary table. */
  counts: {
    bu: { inserts: number; updates: number };
    dept: { inserts: number; updates: number };
    team: { inserts: number; updates: number };
    role: { inserts: number; updates: number };
    oh: { updates: number };
    ohLines: { inserts: number; updates: number };
    settings: { updates: number };
  };
}

function makeState(snapshot: HrSnapshot): PlanState {
  const indices = buildIndices(snapshot);
  const workingBuByName = new Map(indices.buByName);
  const workingDeptByNamePerBu = new Map(indices.deptByNamePerBu);
  const workingTeamByNamePerDept = new Map(indices.teamByNamePerDept);
  return {
    ...indices,
    workingBuByName,
    workingDeptByNamePerBu,
    workingTeamByNamePerDept,
    deltas: emptyDeltas(),
    counts: {
      bu: { inserts: 0, updates: 0 },
      dept: { inserts: 0, updates: 0 },
      team: { inserts: 0, updates: 0 },
      role: { inserts: 0, updates: 0 },
      oh: { updates: 0 },
      ohLines: { inserts: 0, updates: 0 },
      settings: { updates: 0 },
    },
  };
}

function planBusinessUnits(
  workbook: ParsedWorkbook,
  state: PlanState,
  issues: ImportIssue[]
): void {
  const sheet = findSheet(workbook, HR_SHEET_NAMES.businessUnits);
  if (!sheet) return;
  const resolve = getHeaderResolver(sheet);
  const hId = resolve("Id (leave blank for new)");
  const hName = resolve("Name");
  const hCode = resolve("Code");
  const hDesc = resolve("Description");
  const hActive = resolve("Active");

  for (const row of sheet.rows) {
    const env: RowEnv = { sheet, row, issues };
    const name = getStringField(env, hName ?? "");
    if (!name) {
      issues.push(
        issue("error", "Business Unit name is required.", {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
        })
      );
      continue;
    }
    const idCell = getStringField(env, hId ?? "");
    const existing = idCell ? state.buById.get(idCell) : state.workingBuByName.get(ciKey(name));
    const t = nowIso();
    if (existing) {
      const updated: HrBusinessUnit = {
        ...existing,
        name,
        code: hCode ? getStringField(env, hCode) || existing.code : existing.code,
        description: hDesc
          ? getStringField(env, hDesc) || existing.description
          : existing.description,
        isActive: hActive ? getBoolField(env, hActive, existing.isActive) : existing.isActive,
        updatedAt: t,
      };
      state.deltas.businessUnits.push(updated);
      state.workingBuByName.set(ciKey(updated.name), updated);
      state.buById.set(updated.id, updated);
      state.counts.bu.updates += 1;
    } else {
      const created: HrBusinessUnit = {
        id: idCell || newHrId("bu"),
        name,
        code: hCode ? getStringField(env, hCode) : "",
        description: hDesc ? getStringField(env, hDesc) : "",
        isActive: hActive ? getBoolField(env, hActive, true) : true,
        createdAt: t,
        updatedAt: t,
      };
      state.deltas.businessUnits.push(created);
      state.workingBuByName.set(ciKey(created.name), created);
      state.buById.set(created.id, created);
      state.counts.bu.inserts += 1;
    }
  }
}

function planDepartments(
  workbook: ParsedWorkbook,
  state: PlanState,
  issues: ImportIssue[]
): void {
  const sheet = findSheet(workbook, HR_SHEET_NAMES.departments);
  if (!sheet) return;
  const resolve = getHeaderResolver(sheet);
  const hBuName = resolve("Business Unit");
  const hId = resolve("Id (leave blank for new)");
  const hName = resolve("Department name");
  const hCode = resolve("Code");
  const hActive = resolve("Active");

  for (const row of sheet.rows) {
    const env: RowEnv = { sheet, row, issues };
    const buName = getStringField(env, hBuName ?? "");
    const name = getStringField(env, hName ?? "");
    if (!buName || !name) {
      issues.push(
        issue("error", "Department row requires Business Unit and Department name.", {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
        })
      );
      continue;
    }
    const bu = state.workingBuByName.get(ciKey(buName));
    if (!bu) {
      issues.push(
        issue("error", `Unknown Business Unit "${buName}" — add it to the Business Units sheet first.`, {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
          code: "unresolved_ref",
        })
      );
      continue;
    }
    const idCell = getStringField(env, hId ?? "");
    const existing = idCell
      ? state.deptById.get(idCell)
      : state.workingDeptByNamePerBu.get(`${bu.id}::${ciKey(name)}`);
    const t = nowIso();
    if (existing) {
      const updated: HrDepartment = {
        ...existing,
        businessUnitId: bu.id,
        name,
        code: hCode ? getStringField(env, hCode) || existing.code : existing.code,
        isActive: hActive ? getBoolField(env, hActive, existing.isActive) : existing.isActive,
        updatedAt: t,
      };
      state.deltas.departments.push(updated);
      state.workingDeptByNamePerBu.set(`${bu.id}::${ciKey(updated.name)}`, updated);
      state.deptById.set(updated.id, updated);
      state.counts.dept.updates += 1;
    } else {
      const created: HrDepartment = {
        id: idCell || newHrId("dept"),
        businessUnitId: bu.id,
        name,
        code: hCode ? getStringField(env, hCode) : "",
        isActive: hActive ? getBoolField(env, hActive, true) : true,
        createdAt: t,
        updatedAt: t,
      };
      state.deltas.departments.push(created);
      state.workingDeptByNamePerBu.set(`${bu.id}::${ciKey(created.name)}`, created);
      state.deptById.set(created.id, created);
      state.counts.dept.inserts += 1;
    }
  }
}

function planTeams(workbook: ParsedWorkbook, state: PlanState, issues: ImportIssue[]): void {
  const sheet = findSheet(workbook, HR_SHEET_NAMES.teams);
  if (!sheet) return;
  const resolve = getHeaderResolver(sheet);
  const hBuName = resolve("Business Unit");
  const hDeptName = resolve("Department");
  const hId = resolve("Id (leave blank for new)");
  const hName = resolve("Team name");

  for (const row of sheet.rows) {
    const env: RowEnv = { sheet, row, issues };
    const buName = getStringField(env, hBuName ?? "");
    const deptName = getStringField(env, hDeptName ?? "");
    const name = getStringField(env, hName ?? "");
    if (!buName || !deptName || !name) {
      issues.push(
        issue("error", "Team rows require Business Unit, Department and Team name.", {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
        })
      );
      continue;
    }
    const bu = state.workingBuByName.get(ciKey(buName));
    if (!bu) {
      issues.push(
        issue("error", `Unknown Business Unit "${buName}".`, {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
          code: "unresolved_ref",
        })
      );
      continue;
    }
    const dept = state.workingDeptByNamePerBu.get(`${bu.id}::${ciKey(deptName)}`);
    if (!dept) {
      issues.push(
        issue(
          "error",
          `Unknown Department "${deptName}" under Business Unit "${buName}".`,
          {
            sheet: sheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          }
        )
      );
      continue;
    }
    const idCell = getStringField(env, hId ?? "");
    const existing = idCell
      ? state.teamById.get(idCell)
      : state.workingTeamByNamePerDept.get(`${dept.id}::${ciKey(name)}`);
    const t = nowIso();
    if (existing) {
      const updated: HrTeam = {
        ...existing,
        departmentId: dept.id,
        name,
        updatedAt: t,
      };
      state.deltas.teams.push(updated);
      state.workingTeamByNamePerDept.set(`${dept.id}::${ciKey(updated.name)}`, updated);
      state.teamById.set(updated.id, updated);
      state.counts.team.updates += 1;
    } else {
      const created: HrTeam = {
        id: idCell || newHrId("team"),
        departmentId: dept.id,
        name,
        isActive: true,
        createdAt: t,
        updatedAt: t,
      };
      state.deltas.teams.push(created);
      state.workingTeamByNamePerDept.set(`${dept.id}::${ciKey(created.name)}`, created);
      state.teamById.set(created.id, created);
      state.counts.team.inserts += 1;
    }
  }
}

function planRoles(
  workbook: ParsedWorkbook,
  state: PlanState,
  snapshot: HrSnapshot,
  issues: ImportIssue[]
): void {
  const sheet = findSheet(workbook, HR_SHEET_NAMES.roles);
  if (!sheet) return;
  const resolve = getHeaderResolver(sheet);
  const h = {
    bu: resolve("Business Unit"),
    dept: resolve("Department"),
    team: resolve("Team"),
    id: resolve("Id (leave blank for new)"),
    name: resolve("Role name"),
    employment: resolve("Employment type"),
    operational: resolve("Operational role type"),
    headcount: resolve("Employee count"),
    currency: resolve("Currency"),
    salary: resolve("Monthly salary"),
    si: resolve("Monthly social insurance"),
    medical: resolve("Annual medical insurance"),
    eos: resolve("Annual EOS cost"),
    risk: resolve("Risk factor %"),
    billable: resolve("Is billable"),
    ohAlloc: resolve("Include in OH allocation"),
    archived: resolve("Archived"),
    additional: resolve("Additional costs"),
  };

  for (const row of sheet.rows) {
    const env: RowEnv = { sheet, row, issues };
    const buName = getStringField(env, h.bu ?? "");
    const deptName = getStringField(env, h.dept ?? "");
    const roleName = getStringField(env, h.name ?? "");
    if (!buName || !deptName || !roleName) {
      issues.push(
        issue("error", "Role rows require Business Unit, Department, and Role name.", {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
        })
      );
      continue;
    }
    const bu = state.workingBuByName.get(ciKey(buName));
    if (!bu) {
      issues.push(
        issue("error", `Unknown Business Unit "${buName}".`, {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
          code: "unresolved_ref",
        })
      );
      continue;
    }
    const dept = state.workingDeptByNamePerBu.get(`${bu.id}::${ciKey(deptName)}`);
    if (!dept) {
      issues.push(
        issue(
          "error",
          `Unknown Department "${deptName}" under Business Unit "${buName}".`,
          {
            sheet: sheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          }
        )
      );
      continue;
    }
    const teamName = getStringField(env, h.team ?? "");
    const team = teamName
      ? state.workingTeamByNamePerDept.get(`${dept.id}::${ciKey(teamName)}`)
      : null;
    if (teamName && !team) {
      issues.push(
        issue(
          "warning",
          `Team "${teamName}" not found under "${deptName}" — role will be created without a team.`,
          { sheet: sheet.name, rowIndex: row.rowIndex }
        )
      );
    }

    const employmentRaw = getStringField(env, h.employment ?? "").toLowerCase();
    const employment = HR_EMPLOYMENT_TYPES.includes(
      employmentRaw as (typeof HR_EMPLOYMENT_TYPES)[number]
    )
      ? (employmentRaw as (typeof HR_EMPLOYMENT_TYPES)[number])
      : "full_time";

    const operationalRaw = getStringField(env, h.operational ?? "").toLowerCase();
    let operationalRoleType: "delivery" | "indirect" = "delivery";
    if (HR_OPERATIONAL_ROLE_TYPES.includes(operationalRaw as "delivery" | "indirect")) {
      operationalRoleType = operationalRaw as "delivery" | "indirect";
    } else if (h.billable) {
      operationalRoleType = getBoolField(env, h.billable, true) ? "delivery" : "indirect";
    }
    const flags = legacyFlagsForOperationalRoleType(operationalRoleType);

    const idCell = getStringField(env, h.id ?? "");
    const existing = idCell ? state.roleById.get(idCell) : undefined;

    const additionalCosts: JobRoleAdditionalCost[] = parseAdditionalCostsCell(
      getStringField(env, h.additional ?? "")
    );

    const role: JobRole = {
      id: existing?.id ?? (idCell || newHrId("role")),
      businessUnitId: bu.id,
      departmentId: dept.id,
      teamId: team?.id ?? null,
      name: roleName,
      employmentType: employment,
      employeeCount: Math.max(0, Math.floor(getNumericField(env, h.headcount ?? ""))),
      currency:
        getStringField(env, h.currency ?? "") ||
        existing?.currency ||
        snapshot.globalSettings.defaultCurrency,
      avgMonthlySalary: getNumericField(env, h.salary ?? ""),
      avgMonthlySocialInsurance: getNumericField(env, h.si ?? ""),
      annualMedicalInsurance: getNumericField(env, h.medical ?? ""),
      annualEndOfServiceCost: getNumericField(env, h.eos ?? ""),
      riskFactorPct: getNumericField(env, h.risk ?? ""),
      isBillable: h.billable ? getBoolField(env, h.billable, flags.isBillable) : flags.isBillable,
      includeInOhAllocation: h.ohAlloc
        ? getBoolField(env, h.ohAlloc, flags.includeInOhAllocation)
        : flags.includeInOhAllocation,
      operationalRoleType,
      additionalCosts,
      archived: h.archived ? getBoolField(env, h.archived, false) : false,
    };

    state.deltas.roles.push(role);
    state.roleById.set(role.id, role);
    if (existing) state.counts.role.updates += 1;
    else state.counts.role.inserts += 1;
  }
}

function planGlobalSettings(
  workbook: ParsedWorkbook,
  state: PlanState,
  snapshot: HrSnapshot,
  issues: ImportIssue[]
): void {
  const sheet = findSheet(workbook, HR_SHEET_NAMES.globalSettings);
  if (!sheet || sheet.rows.length === 0) return;
  if (sheet.rows.length > 1) {
    issues.push(
      issue("warning", "Global Settings sheet has multiple rows — only the first row is used.", {
        sheet: sheet.name,
      })
    );
  }
  const resolve = getHeaderResolver(sheet);
  const row = sheet.rows[0];
  const env: RowEnv = { sheet, row, issues };
  const settings: Partial<HrGlobalSettings> = {};
  const hDays = resolve("Working days per week");
  const hHours = resolve("Working hours per day");
  const hWeeks = resolve("Weeks per year");
  const hOff = resolve("Off days per year");
  const hCurrency = resolve("Default currency");
  const hTeams = resolve("Use team level");
  if (hDays) settings.workingDaysPerWeek = getNumericField(env, hDays, snapshot.globalSettings.workingDaysPerWeek);
  if (hHours) settings.workingHoursPerDay = getNumericField(env, hHours, snapshot.globalSettings.workingHoursPerDay);
  if (hWeeks) settings.weeksPerYear = getNumericField(env, hWeeks, snapshot.globalSettings.weeksPerYear);
  if (hOff) settings.offDaysPerYear = getNumericField(env, hOff, snapshot.globalSettings.offDaysPerYear);
  if (hCurrency) {
    const cur = getStringField(env, hCurrency);
    if (cur) settings.defaultCurrency = cur;
  }
  if (hTeams) settings.useTeamLevel = getBoolField(env, hTeams, snapshot.globalSettings.useTeamLevel ?? true);
  if (Object.keys(settings).length > 0) {
    state.deltas.globalSettings = settings;
    state.counts.settings.updates = 1;
  }
}

function planOhManual(
  workbook: ParsedWorkbook,
  state: PlanState,
  issues: ImportIssue[]
): void {
  const sheet = findSheet(workbook, HR_SHEET_NAMES.ohManual);
  if (!sheet) return;
  const resolve = getHeaderResolver(sheet);
  const hBu = resolve("Business Unit");
  const hUtil = resolve("Utilization rate %");
  const hHeadcount = resolve("Billable employee count (manual)");
  const hAnnual = resolve("Total annual overhead");
  const hSource = resolve("Billable FTE source");
  const hComposed = resolve("Use composed annual OH");

  const ohMap: Record<string, Partial<OhManualSettings>> = {};

  for (const row of sheet.rows) {
    const env: RowEnv = { sheet, row, issues };
    const buName = getStringField(env, hBu ?? "");
    if (!buName) continue;
    const bu = state.workingBuByName.get(ciKey(buName));
    if (!bu) {
      issues.push(
        issue("error", `Unknown Business Unit "${buName}" in OH Manual sheet.`, {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
          code: "unresolved_ref",
        })
      );
      continue;
    }
    const patch: Partial<OhManualSettings> = {};
    if (hUtil) patch.utilizationRatePct = getNumericField(env, hUtil);
    if (hHeadcount) patch.billableEmployeeCount = getNumericField(env, hHeadcount);
    if (hAnnual) patch.totalAnnualOverhead = getNumericField(env, hAnnual);
    if (hSource) {
      const raw = getStringField(env, hSource).toLowerCase();
      if (HR_OH_FTE_SOURCES.includes(raw as (typeof HR_OH_FTE_SOURCES)[number])) {
        patch.billableFteSource = raw as (typeof HR_OH_FTE_SOURCES)[number];
      }
    }
    if (hComposed) patch.useComposedAnnualOh = getBoolField(env, hComposed, false);
    ohMap[bu.id] = patch;
    state.counts.oh.updates += 1;
  }

  if (Object.keys(ohMap).length > 0) {
    state.deltas.ohManualByBusinessUnitId = ohMap;
  }
}

function planOhLines(workbook: ParsedWorkbook, state: PlanState, issues: ImportIssue[]): void {
  const sheet = findSheet(workbook, HR_SHEET_NAMES.ohLines);
  if (!sheet || sheet.rows.length === 0) return;
  const resolve = getHeaderResolver(sheet);
  const hBu = resolve("Business Unit");
  const hId = resolve("Id (leave blank for new)");
  const hName = resolve("Line name");
  const hCategory = resolve("Category");
  const hAmount = resolve("Amount");
  const hRecurring = resolve("Recurring");
  const hActive = resolve("Active");
  const hNotes = resolve("Notes");

  const linesPerBu = new Map<string, OhNonWorkforceLine[]>();

  for (const row of sheet.rows) {
    const env: RowEnv = { sheet, row, issues };
    const buName = getStringField(env, hBu ?? "");
    const name = getStringField(env, hName ?? "");
    if (!buName || !name) {
      issues.push(
        issue("error", "OH line rows require Business Unit and Line name.", {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
        })
      );
      continue;
    }
    const bu = state.workingBuByName.get(ciKey(buName));
    if (!bu) {
      issues.push(
        issue("error", `Unknown Business Unit "${buName}".`, {
          sheet: sheet.name,
          rowIndex: row.rowIndex,
          code: "unresolved_ref",
        })
      );
      continue;
    }
    const recurringRaw = getStringField(env, hRecurring ?? "").toLowerCase();
    const recurring: OhNonWorkforceLine["recurring"] = HR_OH_LINE_RECURRING.includes(
      recurringRaw as (typeof HR_OH_LINE_RECURRING)[number]
    )
      ? (recurringRaw as OhNonWorkforceLine["recurring"])
      : "monthly";
    const idCell = getStringField(env, hId ?? "");
    const line: OhNonWorkforceLine = {
      id: idCell || newHrId("ohline"),
      name,
      category: hCategory ? getStringField(env, hCategory) : undefined,
      amount: getNumericField(env, hAmount ?? ""),
      recurring,
      active: hActive ? getBoolField(env, hActive, true) : true,
      notes: hNotes ? getStringField(env, hNotes) || undefined : undefined,
    };
    const arr = linesPerBu.get(bu.id) ?? [];
    arr.push(line);
    linesPerBu.set(bu.id, arr);
    if (idCell) state.counts.ohLines.updates += 1;
    else state.counts.ohLines.inserts += 1;
  }

  if (linesPerBu.size === 0) return;

  const existing = state.deltas.ohManualByBusinessUnitId ?? {};
  for (const [buId, lines] of linesPerBu.entries()) {
    existing[buId] = { ...(existing[buId] ?? {}), ohNonWorkforceLines: lines };
  }
  state.deltas.ohManualByBusinessUnitId = existing;
}

export function planHrUpload(
  workbook: ParsedWorkbook,
  snapshot: HrSnapshot
): ImportPlanResult<HrEngineImportDeltas> {
  const issues: ImportIssue[] = [];
  const state = makeState(snapshot);

  planBusinessUnits(workbook, state, issues);
  planDepartments(workbook, state, issues);
  planTeams(workbook, state, issues);
  planRoles(workbook, state, snapshot, issues);
  planGlobalSettings(workbook, state, snapshot, issues);
  planOhManual(workbook, state, issues);
  planOhLines(workbook, state, issues);

  const changeSummary: ImportChangeSummaryRow[] = [
    {
      entity: "Business Units",
      inserts: state.counts.bu.inserts,
      updates: state.counts.bu.updates,
    },
    {
      entity: "Departments",
      inserts: state.counts.dept.inserts,
      updates: state.counts.dept.updates,
    },
    {
      entity: "Teams",
      inserts: state.counts.team.inserts,
      updates: state.counts.team.updates,
    },
    {
      entity: "Roles",
      inserts: state.counts.role.inserts,
      updates: state.counts.role.updates,
    },
    {
      entity: "OH Manual (per BU)",
      inserts: 0,
      updates: state.counts.oh.updates,
    },
    {
      entity: "OH Non-Workforce Lines",
      inserts: state.counts.ohLines.inserts,
      updates: state.counts.ohLines.updates,
    },
    {
      entity: "Global Settings",
      inserts: 0,
      updates: state.counts.settings.updates,
    },
  ];

  const ok = !issues.some((i) => i.level === "error");

  return {
    ok,
    issues,
    changeSummary,
    deltas: ok ? state.deltas : undefined,
  };
}
