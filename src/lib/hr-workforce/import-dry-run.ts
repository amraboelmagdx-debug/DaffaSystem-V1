import type { HrBusinessUnit, HrDepartment, HrTeam, JobRole } from "@/types/hr-workforce";
import { newHrId } from "./id";
import {
  IMPORT_COLUMN_LABELS,
  listUnmappedImportKeys,
  mapRowToJobRole,
  type ImportColumnKey,
  type ParsedImportRow,
  validateJobRole,
} from "./import-parser";
import { nowIso } from "./structure-utils";

export interface ImportExistingSnapshot {
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  defaultCurrency: string;
}

export interface ImportApplyDeltas {
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  roles: JobRole[];
}

export type ImportPlanOptions = {
  /** When true, plan contains only structure/roles from the file (no merge with existing Main/General). */
  replaceExisting?: boolean;
};

export type ImportPlanResult =
  | { ok: false; errors: string[] }
  | {
      ok: true;
      preview: {
        newBusinessUnits: number;
        newDepartments: number;
        newTeams: number;
        roles: number;
        replaceExisting: boolean;
        unmappedCompensationFields: string[];
        sampleRole?: {
          name: string;
          annualEndOfServiceCost: number;
          riskFactorPct: number;
          additionalCostsCount: number;
        };
      };
      deltas: ImportApplyDeltas;
    };

function ciKey(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Pure import planning: no store mutation.
 * Builds new BU/dept/team rows and roles with final IDs ready to merge.
 */
export function buildImportPlan(
  existing: ImportExistingSnapshot,
  rows: ParsedImportRow[],
  columnMap: Partial<Record<ImportColumnKey, string>>,
  options?: ImportPlanOptions
): ImportPlanResult {
  const replaceExisting = options?.replaceExisting === true;
  const errors: string[] = [];

  const businessUnits = new Map<string, HrBusinessUnit>();
  const departments = new Map<string, HrDepartment>();
  const teams = new Map<string, HrTeam>();

  const deltaBus: HrBusinessUnit[] = [];
  const deltaDepts: HrDepartment[] = [];
  const deltaTeams: HrTeam[] = [];

  if (!replaceExisting) {
    for (const u of existing.businessUnits) {
      businessUnits.set(ciKey(u.name), { ...u });
    }
    for (const d of existing.departments) {
      departments.set(`${d.businessUnitId}::${ciKey(d.name)}`, { ...d });
    }
    for (const t of existing.teams) {
      teams.set(`${t.departmentId}::${ciKey(t.name)}`, { ...t });
    }
  }

  const ensureBu = (nameRaw: string | undefined): HrBusinessUnit | null => {
    const name = (nameRaw ?? "").trim();
    if (!name) return null;
    const k = ciKey(name);
    let u = businessUnits.get(k);
    if (u) return u;
    const t = nowIso();
    u = {
      id: newHrId("bu"),
      name: name.trim(),
      code: "",
      description: "",
      isActive: true,
      createdAt: t,
      updatedAt: t,
    };
    businessUnits.set(k, u);
    deltaBus.push(u);
    return u;
  };

  const ensureDept = (bu: HrBusinessUnit, deptNameRaw: string): HrDepartment | null => {
    const deptName = deptNameRaw.trim();
    if (!deptName) return null;
    const key = `${bu.id}::${ciKey(deptName)}`;
    let d = departments.get(key);
    if (d) return d;
    const t = nowIso();
    d = {
      id: newHrId("dept"),
      businessUnitId: bu.id,
      name: deptName,
      code: "",
      isActive: true,
      createdAt: t,
      updatedAt: t,
    };
    departments.set(key, d);
    deltaDepts.push(d);
    return d;
  };

  const ensureTeam = (dept: HrDepartment, teamNameRaw: string): HrTeam | null => {
    const teamName = teamNameRaw.trim();
    if (!teamName) return null;
    const key = `${dept.id}::${ciKey(teamName)}`;
    let tm = teams.get(key);
    if (tm) return tm;
    const t = nowIso();
    tm = {
      id: newHrId("team"),
      departmentId: dept.id,
      name: teamName,
      isActive: true,
      createdAt: t,
      updatedAt: t,
    };
    teams.set(key, tm);
    deltaTeams.push(tm);
    return tm;
  };

  const resolveDepartment = (args: { departmentName: string; businessUnitName?: string }) => {
    const bu = ensureBu(args.businessUnitName);
    if (!bu) return null;
    const dept = ensureDept(bu, args.departmentName);
    if (!dept) return null;
    return { departmentId: dept.id, businessUnitId: bu.id };
  };

  const resolveTeamId = (deptId: string, teamName: string): string | null => {
    const dept = [...departments.values()].find((d) => d.id === deptId);
    if (!dept) return null;
    const tm = ensureTeam(dept, teamName);
    return tm?.id ?? null;
  };

  const rolesOut: JobRole[] = [];

  for (const row of rows) {
    const role = mapRowToJobRole({
      row,
      columnMap,
      resolveDepartment,
      resolveTeamId,
      defaultCurrency: existing.defaultCurrency,
    });
    if (!role) {
      const buCell = columnMap.businessUnit
        ? row.values[columnMap.businessUnit] ?? ""
        : "";
      if (!buCell.trim()) {
        errors.push(`Row ${row.rowIndex}: Business Unit is required (empty cell — will not use "Main")`);
      } else {
        errors.push(`Row ${row.rowIndex}: missing department (or business unit could not be resolved)`);
      }
      continue;
    }
    const v = validateJobRole(role);
    if (v.length) {
      errors.push(`Row ${row.rowIndex}: ${v.map((x) => x.message).join("; ")}`);
      continue;
    }
    rolesOut.push(role);
  }

  if (errors.length) return { ok: false, errors };

  const unmapped = listUnmappedImportKeys(columnMap).map((k) => IMPORT_COLUMN_LABELS[k]);
  const sample = rolesOut[0];

  return {
    ok: true,
    preview: {
      newBusinessUnits: replaceExisting ? businessUnits.size : deltaBus.length,
      newDepartments: replaceExisting ? departments.size : deltaDepts.length,
      newTeams: replaceExisting ? teams.size : deltaTeams.length,
      roles: rolesOut.length,
      replaceExisting,
      unmappedCompensationFields: unmapped,
      sampleRole: sample
        ? {
            name: sample.name,
            annualEndOfServiceCost: sample.annualEndOfServiceCost,
            riskFactorPct: sample.riskFactorPct,
            additionalCostsCount: sample.additionalCosts.length,
          }
        : undefined,
    },
    deltas: {
      businessUnits: replaceExisting ? [...businessUnits.values()] : deltaBus,
      departments: replaceExisting ? [...departments.values()] : deltaDepts,
      teams: replaceExisting ? [...teams.values()] : deltaTeams,
      roles: rolesOut,
    },
  };
}
