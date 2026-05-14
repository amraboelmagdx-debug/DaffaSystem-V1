import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrImportLogEntry,
  HrSnapshotMeta,
  HrTeam,
  JobRole,
  OhManualSettings,
} from "@/types/hr-workforce";
import type { HrSnapshotPayloadV1, HrSnapshotPayloadV2 } from "@/types/hr-workforce";
import { newHrId } from "@/lib/hr-workforce/id";
import type { ImportApplyDeltas } from "@/lib/hr-workforce/import-dry-run";
import { deriveHrWorkforceModel } from "@/lib/hr-workforce/selectors";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import { migrateRoleOperationalType } from "@/lib/hr-workforce/role-operational-type";
import { nowIso } from "@/lib/hr-workforce/structure-utils";
import { seedDemoWorkforceIfEmpty, type DemoWorkforceSeedResult } from "@/lib/hr-workforce/demo-workforce-seed";
import { getHrWorkforceHybridStateStorage } from "@/lib/hr-workforce/hr-workforce-hybrid-persist-storage";

const DEFAULT_HR_SETTINGS: HrGlobalSettings = {
  workingDaysPerWeek: 5,
  workingHoursPerDay: 8,
  weeksPerYear: 52,
  offDaysPerYear: 10,
  defaultCurrency: "SAR",
  useTeamLevel: true,
};

/** Old saves stored a separate "default utilization" on HR globals; fold into OH manual on read. */
type LegacyHrGlobal = Partial<HrGlobalSettings> & { defaultUtilizationPct?: number };

function clampUtilPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Merge persisted OH manual; if `utilizationRatePct` absent/invalid, use legacy `defaultUtilizationPct` from HR, else default 80. */
function migrateOhManualFromPersist(
  partial: Partial<OhManualSettings> | undefined,
  legacyHr?: LegacyHrGlobal
): OhManualSettings {
  const legacyU =
    legacyHr && typeof legacyHr.defaultUtilizationPct === "number" && !Number.isNaN(legacyHr.defaultUtilizationPct)
      ? legacyHr.defaultUtilizationPct
      : undefined;
  const merged: OhManualSettings = {
    ...DEFAULT_OH,
    ...(partial ?? {}),
    billableFteSource: partial?.billableFteSource ?? "manual",
    ohNonWorkforceLines: Array.isArray(partial?.ohNonWorkforceLines)
      ? partial!.ohNonWorkforceLines!
      : DEFAULT_OH.ohNonWorkforceLines,
  };
  const util =
    typeof partial?.utilizationRatePct === "number" && !Number.isNaN(partial.utilizationRatePct)
      ? clampUtilPct(partial.utilizationRatePct)
      : typeof legacyU === "number"
        ? clampUtilPct(legacyU)
        : DEFAULT_OH.utilizationRatePct;
  return { ...merged, utilizationRatePct: util };
}

/** Stored workspaces used USD as the product default; migrate to SAR on rehydrate. */
function migrateStoredDefaultCurrency(code: string | undefined): string {
  const c = (code ?? "").trim().toUpperCase();
  if (!c || c.length !== 3 || c === "USD") return "SAR";
  return c;
}

function migratedHrGlobalSettings(partial: Partial<HrGlobalSettings> | undefined): HrGlobalSettings {
  const { defaultUtilizationPct: _legacyDrop, ...rest } = (partial ?? {}) as LegacyHrGlobal;
  const merged: HrGlobalSettings = { ...DEFAULT_HR_SETTINGS, ...rest };
  return { ...merged, defaultCurrency: migrateStoredDefaultCurrency(merged.defaultCurrency) };
}

function migratedRoleCurrency(roleCurrency: string | undefined, orgDefault: string): string {
  const r = (roleCurrency ?? "").trim().toUpperCase();
  if (r === "USD") return "SAR";
  if (!r || r.length !== 3) return migrateStoredDefaultCurrency(orgDefault);
  return r;
}

function migratedRoles(roles: JobRole[], orgDefault: string): JobRole[] {
  const def = migrateStoredDefaultCurrency(orgDefault);
  return roles.map((r) => ({ ...r, currency: migratedRoleCurrency(r.currency, def) }));
}

/** Build per–business-unit OH settings from persisted v2 (legacy flat `ohManual` or keyed map). */
function resolveOhManualMapForUnits(
  businessUnits: HrBusinessUnit[],
  sources: {
    ohManual?: Partial<OhManualSettings> | undefined;
    ohManualByBusinessUnitId?: Record<string, Partial<OhManualSettings>> | undefined;
  },
  legacyHr?: LegacyHrGlobal
): Record<string, OhManualSettings> {
  const out: Record<string, OhManualSettings> = {};
  const legacyFlat =
    sources.ohManual && typeof sources.ohManual === "object"
      ? migrateOhManualFromPersist(sources.ohManual, legacyHr)
      : undefined;
  const map = sources.ohManualByBusinessUnitId;

  for (const u of businessUnits) {
    const row = map && typeof map[u.id] === "object" ? map[u.id] : undefined;
    if (row !== undefined) {
      out[u.id] = migrateOhManualFromPersist(row, legacyHr);
    } else if (legacyFlat) {
      out[u.id] = { ...legacyFlat };
    } else {
      out[u.id] = migrateOhManualFromPersist(undefined, legacyHr);
    }
  }
  return out;
}

function seedOrg(): {
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
} {
  const t = nowIso();
  const bu: HrBusinessUnit = {
    id: newHrId("bu"),
    name: "Main",
    code: "MAIN",
    description: "Default business unit",
    isActive: true,
    createdAt: t,
    updatedAt: t,
  };
  const dept: HrDepartment = {
    id: newHrId("dept"),
    businessUnitId: bu.id,
    name: "General",
    code: "",
    isActive: true,
    createdAt: t,
    updatedAt: t,
  };
  return { businessUnits: [bu], departments: [dept], teams: [] };
}

export interface HrSnapshotRecord {
  meta: HrSnapshotMeta;
  payloadJson: string;
}

interface HrWorkforceState {
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  roles: JobRole[];
  hrGlobalSettings: HrGlobalSettings;
  ohManualByBusinessUnitId: Record<string, OhManualSettings>;
  importLogs: HrImportLogEntry[];
  snapshots: HrSnapshotRecord[];

  setHrGlobalSettings: (patch: Partial<HrGlobalSettings>) => void;
  setOhManualForBusinessUnit: (businessUnitId: string, patch: Partial<OhManualSettings>) => void;

  addBusinessUnit: (p: { name: string; code?: string; description?: string }) => HrBusinessUnit;
  updateBusinessUnit: (id: string, patch: Partial<HrBusinessUnit>) => void;

  addDepartment: (businessUnitId: string, name: string) => HrDepartment;
  updateDepartment: (id: string, patch: Partial<HrDepartment>) => void;

  addTeam: (departmentId: string, name: string) => HrTeam;
  updateTeam: (id: string, patch: Partial<HrTeam>) => void;
  /** Removes unit and all departments, teams, and roles under it. No-op if this is the only business unit. */
  deleteBusinessUnit: (id: string) => void;
  /** Removes department, its teams, and all roles in that department. No-op if this is the only department. */
  deleteDepartment: (id: string) => void;
  /** Removes team and clears team assignment on roles that referenced it. */
  deleteTeam: (id: string) => void;

  upsertRole: (role: JobRole) => void;
  addRole: (partial: Partial<Omit<JobRole, "id">> & { departmentId: string }) => JobRole;
  updateRole: (id: string, patch: Partial<JobRole>) => void;
  duplicateRole: (id: string) => void;
  archiveRole: (id: string, archived: boolean) => void;
  /** Permanently removes the role row from the module. */
  deleteRole: (id: string) => void;
  bulkPatchRoles: (ids: string[], patch: Partial<JobRole>) => void;
  bulkDeleteRoles: (ids: string[]) => void;

  applyImportDeltas: (deltas: ImportApplyDeltas) => void;
  pushImportLog: (entry: Omit<HrImportLogEntry, "id" | "createdAt"> & Partial<Pick<HrImportLogEntry, "id" | "createdAt">>) => void;
  deleteImportLog: (logId: string) => void;
  clearAllImportLogs: () => void;

  saveSnapshot: (label: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  compareSnapshots: (aId: string, bId: string) => HrSnapshotCompareResult | null;

  resetModule: () => void;
  /** Adds illustrative roles, a delivery department + team, and composed OH lines when there are no active roles. */
  seedDemoWorkforce: () => DemoWorkforceSeedResult;
}

export interface HrSnapshotCompareResult {
  aLabel: string;
  bLabel: string;
  /** Difference in stored role row counts (includes archived). */
  rolesDelta: number;
  departmentsDelta: number;
  teamsDelta: number;
  businessUnitsDelta: number;
  /** Sum of employee counts on non-archived roles (B − A). */
  headcountDelta: number;
  /** Operational monthly workforce cost (active chain) from engine: B − A. */
  monthlyCostDeltaApprox: number | null;
}

function emptyRoleTemplate(
  deptId: string,
  businessUnitId: string,
  orgDefaultCurrency: string
): Omit<JobRole, "id"> {
  const currency = migratedRoleCurrency(undefined, orgDefaultCurrency);
  return {
    businessUnitId,
    departmentId: deptId,
    teamId: undefined,
    name: "New role",
    employmentType: "full_time",
    employeeCount: 1,
    currency,
    operationalRoleType: "delivery",
    avgMonthlySalary: 0,
    avgMonthlySocialInsurance: 0,
    annualMedicalInsurance: 0,
    annualEndOfServiceCost: 0,
    riskFactorPct: 0,
    isBillable: true,
    includeInOhAllocation: true,
    additionalCosts: [],
    archived: false,
  };
}

function migrateV1Payload(
  p: HrSnapshotPayloadV1
): Omit<HrSnapshotPayloadV2, "v" | "hrGlobalSettings" | "ohManual" | "ohManualByBusinessUnitId"> {
  const t = nowIso();
  const bu: HrBusinessUnit = {
    id: newHrId("bu"),
    name: "Imported (legacy)",
    code: "",
    description: "Migrated from snapshot v1",
    isActive: true,
    createdAt: t,
    updatedAt: t,
  };
  const legacyDepts = p.departments as unknown as (HrDepartment & { archived?: boolean })[];
  const departments: HrDepartment[] = legacyDepts.map((d) => {
    const isActive = typeof d.isActive === "boolean" ? d.isActive : !d.archived;
    const businessUnitId = d.businessUnitId ?? bu.id;
    return {
      ...d,
      businessUnitId,
      isActive: isActive ?? true,
      createdAt: d.createdAt ?? t,
      updatedAt: d.updatedAt ?? t,
    };
  });
  const legacyTeams = p.teams as unknown as (HrTeam & { archived?: boolean })[];
  const teams: HrTeam[] = legacyTeams.map((tm) => {
    const isActive = typeof tm.isActive === "boolean" ? tm.isActive : !tm.archived;
    return {
      ...tm,
      isActive: isActive ?? true,
      createdAt: tm.createdAt ?? t,
      updatedAt: tm.updatedAt ?? t,
    };
  });
  const roles: JobRole[] = p.roles
    .map((r) => ({
      ...r,
      businessUnitId:
        r.businessUnitId ||
        departments.find((d) => d.id === r.departmentId)?.businessUnitId ||
        bu.id,
    }))
    .map(migrateRoleOperationalType);
  return { businessUnits: [bu], departments, teams, roles };
}

export function parseHrSnapshotPayload(json: string): HrSnapshotPayloadV2 {
  const raw = JSON.parse(json) as HrSnapshotPayloadV2 & { v?: number };
  if (raw && typeof raw === "object" && raw.v === 2) {
    const hrRaw = raw.hrGlobalSettings as LegacyHrGlobal;
    const hrGlobalSettings = migratedHrGlobalSettings(hrRaw);
    const ohManualByBusinessUnitId = resolveOhManualMapForUnits(
      raw.businessUnits,
      {
        ohManual: raw.ohManual,
        ohManualByBusinessUnitId: raw.ohManualByBusinessUnitId,
      },
      hrRaw
    );
    return {
      v: 2,
      businessUnits: raw.businessUnits,
      departments: raw.departments,
      teams: raw.teams,
      roles: raw.roles,
      hrGlobalSettings,
      ohManualByBusinessUnitId,
    };
  }
  const legacy = raw as unknown as HrSnapshotPayloadV1;
  const m = migrateV1Payload(legacy);
  const hrRaw = legacy.hrGlobalSettings as LegacyHrGlobal;
  const hrGlobalSettings = migratedHrGlobalSettings(hrRaw);
  const ohManualByBusinessUnitId = resolveOhManualMapForUnits(m.businessUnits, {
    ohManual: legacy.ohManual,
    ohManualByBusinessUnitId: undefined,
  }, hrRaw);
  return {
    v: 2,
    ...m,
    hrGlobalSettings,
    ohManualByBusinessUnitId,
  };
}

function normalizePersistedState(p: Partial<HrWorkforceState> | undefined): Partial<HrWorkforceState> {
  if (!p) return {};
  const t = nowIso();
  let businessUnits = Array.isArray(p.businessUnits) ? [...p.businessUnits] : [];
  let departments = Array.isArray(p.departments) ? [...p.departments] : [];
  const teams = Array.isArray(p.teams) ? [...p.teams] : [];

  if (businessUnits.length === 0) {
    const bu: HrBusinessUnit = {
      id: newHrId("bu"),
      name: "Main",
      code: "MAIN",
      description: "",
      isActive: true,
      createdAt: t,
      updatedAt: t,
    };
    businessUnits = [bu];
  }

  departments = departments.map((d) => {
    const legacy = d as HrDepartment & { archived?: boolean };
    const isActive = typeof legacy.isActive === "boolean" ? legacy.isActive : !legacy.archived;
    const businessUnitId = legacy.businessUnitId ?? businessUnits[0].id;
    return {
      ...d,
      businessUnitId,
      isActive: isActive ?? true,
      createdAt: legacy.createdAt ?? t,
      updatedAt: legacy.updatedAt ?? t,
    };
  });

  const teamsN = teams.map((tm) => {
    const legacy = tm as HrTeam & { archived?: boolean };
    const isActive = typeof legacy.isActive === "boolean" ? legacy.isActive : !legacy.archived;
    return {
      ...tm,
      isActive: isActive ?? true,
      createdAt: legacy.createdAt ?? t,
      updatedAt: legacy.updatedAt ?? t,
    };
  });

  const hrRaw = p.hrGlobalSettings as LegacyHrGlobal | undefined;
  const hrGlobalSettings = migratedHrGlobalSettings(hrRaw);

  const rolesRaw: JobRole[] = (Array.isArray(p.roles) ? p.roles : []).map((r) => ({
    ...r,
    businessUnitId:
      r.businessUnitId ||
      departments.find((d) => d.id === r.departmentId)?.businessUnitId ||
      businessUnits[0].id,
    additionalCosts: Array.isArray(r.additionalCosts) ? r.additionalCosts : [],
  }));
  const roles = migratedRoles(rolesRaw, hrGlobalSettings.defaultCurrency).map(migrateRoleOperationalType);

  const legacyPersist = p as Partial<HrWorkforceState> & {
    ohManual?: Partial<OhManualSettings>;
    ohManualByBusinessUnitId?: Record<string, Partial<OhManualSettings>>;
  };
  const ohManualByBusinessUnitId = resolveOhManualMapForUnits(
    businessUnits,
    {
      ohManual: legacyPersist.ohManual,
      ohManualByBusinessUnitId: legacyPersist.ohManualByBusinessUnitId,
    },
    hrGlobalSettings as LegacyHrGlobal
  );

  return {
    importLogs: Array.isArray(p.importLogs) ? p.importLogs : undefined,
    snapshots: Array.isArray(p.snapshots) ? p.snapshots : undefined,
    businessUnits,
    departments,
    teams: teamsN,
    roles,
    hrGlobalSettings,
    ohManualByBusinessUnitId,
  };
}

const seed = seedOrg();
const initialOhManualByBusinessUnitId: Record<string, OhManualSettings> = {
  [seed.businessUnits[0].id]: { ...DEFAULT_OH },
};

export const useHrWorkforceStore = create<HrWorkforceState>()(
  persist(
    (set, get) => ({
      businessUnits: seed.businessUnits,
      departments: seed.departments,
      teams: seed.teams,
      roles: [],
      hrGlobalSettings: { ...DEFAULT_HR_SETTINGS },
      ohManualByBusinessUnitId: { ...initialOhManualByBusinessUnitId },
      importLogs: [],
      snapshots: [],

      setHrGlobalSettings: (patch) =>
        set({ hrGlobalSettings: { ...get().hrGlobalSettings, ...patch } }),
      setOhManualForBusinessUnit: (businessUnitId, patch) => {
        const st = get();
        const prev = st.ohManualByBusinessUnitId[businessUnitId] ?? DEFAULT_OH;
        set({
          ohManualByBusinessUnitId: {
            ...st.ohManualByBusinessUnitId,
            [businessUnitId]: migrateOhManualFromPersist(
              { ...prev, ...patch },
              st.hrGlobalSettings as LegacyHrGlobal
            ),
          },
        });
      },

      addBusinessUnit: ({ name, code, description }) => {
        const t = nowIso();
        const u: HrBusinessUnit = {
          id: newHrId("bu"),
          name: name.trim() || "Business unit",
          code: code?.trim() ?? "",
          description: description?.trim() ?? "",
          isActive: true,
          createdAt: t,
          updatedAt: t,
        };
        set({
          businessUnits: [...get().businessUnits, u],
          ohManualByBusinessUnitId: {
            ...get().ohManualByBusinessUnitId,
            [u.id]: { ...DEFAULT_OH },
          },
        });
        return u;
      },

      updateBusinessUnit: (id, patch) => {
        const t = nowIso();
        set({
          businessUnits: get().businessUnits.map((u) =>
            u.id === id ? { ...u, ...patch, updatedAt: t } : u
          ),
        });
      },

      addDepartment: (businessUnitId, name) => {
        const t = nowIso();
        const d: HrDepartment = {
          id: newHrId("dept"),
          businessUnitId,
          name: name.trim() || "Department",
          code: "",
          isActive: true,
          createdAt: t,
          updatedAt: t,
        };
        set({ departments: [...get().departments, d] });
        return d;
      },

      updateDepartment: (id, patch) => {
        const t = nowIso();
        set({
          departments: get().departments.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: t } : d
          ),
        });
      },

      addTeam: (departmentId, name) => {
        const t = nowIso();
        const tm: HrTeam = {
          id: newHrId("team"),
          departmentId,
          name: name.trim() || "Team",
          isActive: true,
          createdAt: t,
          updatedAt: t,
        };
        set({ teams: [...get().teams, tm] });
        return tm;
      },

      updateTeam: (id, patch) => {
        const t = nowIso();
        set({
          teams: get().teams.map((tm) => (tm.id === id ? { ...tm, ...patch, updatedAt: t } : tm)),
        });
      },

      deleteBusinessUnit: (id) => {
        const st = get();
        if (st.businessUnits.length <= 1) return;
        const deptIds = new Set(
          st.departments.filter((d) => d.businessUnitId === id).map((d) => d.id)
        );
        const { [id]: _removed, ...restOh } = st.ohManualByBusinessUnitId;
        set({
          businessUnits: st.businessUnits.filter((u) => u.id !== id),
          departments: st.departments.filter((d) => d.businessUnitId !== id),
          teams: st.teams.filter((tm) => !deptIds.has(tm.departmentId)),
          roles: st.roles.filter((r) => !deptIds.has(r.departmentId) && r.businessUnitId !== id),
          ohManualByBusinessUnitId: restOh,
        });
      },

      deleteDepartment: (id) => {
        const st = get();
        if (st.departments.length <= 1) return;
        set({
          departments: st.departments.filter((d) => d.id !== id),
          teams: st.teams.filter((tm) => tm.departmentId !== id),
          roles: st.roles.filter((r) => r.departmentId !== id),
        });
      },

      deleteTeam: (teamId) => {
        set({
          teams: get().teams.filter((tm) => tm.id !== teamId),
          roles: get().roles.map((r) => (r.teamId === teamId ? { ...r, teamId: undefined } : r)),
        });
      },

      upsertRole: (role) =>
        set({
          roles: get().roles.some((r) => r.id === role.id)
            ? get().roles.map((r) => (r.id === role.id ? role : r))
            : [...get().roles, role],
        }),

      addRole: (partial) => {
        const st = get();
        const dept = st.departments.find((d) => d.id === partial.departmentId);
        const buId = partial.businessUnitId ?? dept?.businessUnitId ?? st.businessUnits[0]?.id ?? "";
        const base = emptyRoleTemplate(partial.departmentId, buId, st.hrGlobalSettings.defaultCurrency);
        const role: JobRole = {
          ...base,
          ...partial,
          id: newHrId("role"),
          additionalCosts: partial.additionalCosts ?? base.additionalCosts,
        };
        set({ roles: [...st.roles, role] });
        return role;
      },

      updateRole: (id, patch) =>
        set({
          roles: get().roles.map((r) => {
            if (r.id !== id) return r;
            const next = { ...r, ...patch };
            if (patch.departmentId && patch.departmentId !== r.departmentId) {
              const d = get().departments.find((x) => x.id === next.departmentId);
              if (d) next.businessUnitId = d.businessUnitId;
            }
            return next;
          }),
        }),

      duplicateRole: (id) => {
        const st = get();
        const src = st.roles.find((r) => r.id === id);
        if (!src) return;
        const copy: JobRole = {
          ...src,
          id: newHrId("role"),
          name: `${src.name} (copy)`,
          currency: migratedRoleCurrency(src.currency, st.hrGlobalSettings.defaultCurrency),
          additionalCosts: src.additionalCosts.map((c) => ({
            ...c,
            id: newHrId("cost"),
          })),
        };
        set({ roles: [...get().roles, copy] });
      },

      archiveRole: (id, archived) =>
        set({
          roles: get().roles.map((r) => (r.id === id ? { ...r, archived } : r)),
        }),

      deleteRole: (id) => set({ roles: get().roles.filter((r) => r.id !== id) }),

      bulkPatchRoles: (ids, patch) => {
        const idSet = new Set(ids);
        set({
          roles: get().roles.map((r) => (idSet.has(r.id) ? { ...r, ...patch } : r)),
        });
      },

      bulkDeleteRoles: (ids) => {
        const idSet = new Set(ids);
        set({ roles: get().roles.filter((r) => !idSet.has(r.id)) });
      },

      applyImportDeltas: (deltas) =>
        set((s) => {
          const nextOh = { ...s.ohManualByBusinessUnitId };
          for (const u of deltas.businessUnits) {
            if (!nextOh[u.id]) nextOh[u.id] = { ...DEFAULT_OH };
          }
          return {
            businessUnits: [...s.businessUnits, ...deltas.businessUnits],
            departments: [...s.departments, ...deltas.departments],
            teams: [...s.teams, ...deltas.teams],
            roles: [...s.roles, ...deltas.roles],
            ohManualByBusinessUnitId: nextOh,
          };
        }),

      pushImportLog: (entry) => {
        const full: HrImportLogEntry = {
          id: entry.id ?? newHrId("log"),
          createdAt: entry.createdAt ?? new Date().toISOString(),
          fileName: entry.fileName,
          rowCount: entry.rowCount,
          status: entry.status,
          message: entry.message,
        };
        set({ importLogs: [full, ...get().importLogs].slice(0, 100) });
      },

      deleteImportLog: (logId) =>
        set({ importLogs: get().importLogs.filter((l) => l.id !== logId) }),

      clearAllImportLogs: () => set({ importLogs: [] }),

      saveSnapshot: (label) => {
        const s = get();
        const meta: HrSnapshotMeta = {
          id: newHrId("snap"),
          createdAt: new Date().toISOString(),
          label: label.trim() || "Snapshot",
        };
        const payload: HrSnapshotPayloadV2 = {
          v: 2,
          businessUnits: s.businessUnits,
          departments: s.departments,
          teams: s.teams,
          roles: s.roles,
          hrGlobalSettings: s.hrGlobalSettings,
          ohManualByBusinessUnitId: s.ohManualByBusinessUnitId,
        };
        const rec: HrSnapshotRecord = {
          meta,
          payloadJson: JSON.stringify(payload),
        };
        set({ snapshots: [rec, ...s.snapshots].slice(0, 50) });
      },

      restoreSnapshot: (snapshotId) => {
        const s = get();
        const snap = s.snapshots.find((x) => x.meta.id === snapshotId);
        if (!snap) return;
        const payload = parseHrSnapshotPayload(snap.payloadJson);
        const roles = migratedRoles(payload.roles, payload.hrGlobalSettings.defaultCurrency).map(migrateRoleOperationalType);
        set({
          businessUnits: payload.businessUnits,
          departments: payload.departments,
          teams: payload.teams,
          roles,
          hrGlobalSettings: payload.hrGlobalSettings,
          ohManualByBusinessUnitId: payload.ohManualByBusinessUnitId,
        });
      },

      deleteSnapshot: (snapshotId) =>
        set({ snapshots: get().snapshots.filter((x) => x.meta.id !== snapshotId) }),

      compareSnapshots: (aId, bId) => {
        const s = get();
        const a = s.snapshots.find((x) => x.meta.id === aId);
        const b = s.snapshots.find((x) => x.meta.id === bId);
        if (!a || !b) return null;
        try {
          const pa = parseHrSnapshotPayload(a.payloadJson);
          const pb = parseHrSnapshotPayload(b.payloadJson);
          const headA = pa.roles.filter((r) => !r.archived).reduce((x, r) => x + r.employeeCount, 0);
          const headB = pb.roles.filter((r) => !r.archived).reduce((x, r) => x + r.employeeCount, 0);
          const ma = deriveHrWorkforceModel({
            roles: pa.roles,
            businessUnits: pa.businessUnits,
            departments: pa.departments,
            teams: pa.teams,
            hrGlobalSettings: pa.hrGlobalSettings,
            ohManualByBusinessUnitId: pa.ohManualByBusinessUnitId ?? {},
          });
          const mb = deriveHrWorkforceModel({
            roles: pb.roles,
            businessUnits: pb.businessUnits,
            departments: pb.departments,
            teams: pb.teams,
            hrGlobalSettings: pb.hrGlobalSettings,
            ohManualByBusinessUnitId: pb.ohManualByBusinessUnitId ?? {},
          });
          return {
            aLabel: a.meta.label,
            bLabel: b.meta.label,
            rolesDelta: pb.roles.length - pa.roles.length,
            departmentsDelta: pb.departments.length - pa.departments.length,
            teamsDelta: pb.teams.length - pa.teams.length,
            businessUnitsDelta: pb.businessUnits.length - pa.businessUnits.length,
            headcountDelta: headB - headA,
            monthlyCostDeltaApprox: mb.dashboard.monthlyWorkforceCost - ma.dashboard.monthlyWorkforceCost,
          };
        } catch {
          return null;
        }
      },

      resetModule: () => {
        const org = seedOrg();
        set({
          businessUnits: org.businessUnits,
          departments: org.departments,
          teams: org.teams,
          roles: [],
          hrGlobalSettings: { ...DEFAULT_HR_SETTINGS },
          ohManualByBusinessUnitId: { [org.businessUnits[0].id]: { ...DEFAULT_OH } },
          importLogs: [],
          snapshots: [],
        });
      },

      seedDemoWorkforce: () => {
        const st = get();
        const primaryBuId = st.businessUnits[0]?.id;
        return seedDemoWorkforceIfEmpty({
          roles: st.roles,
          businessUnits: st.businessUnits,
          departments: st.departments,
          teams: st.teams,
          defaultCurrency: st.hrGlobalSettings.defaultCurrency,
          ohManualForPrimaryBu: primaryBuId
            ? st.ohManualByBusinessUnitId[primaryBuId]
            : undefined,
          addDepartment: (businessUnitId, name) => get().addDepartment(businessUnitId, name),
          addTeam: (departmentId, name) => get().addTeam(departmentId, name),
          addRole: (partial) => {
            get().addRole(partial);
          },
          setOhManualForBusinessUnit: (businessUnitId, patch) =>
            get().setOhManualForBusinessUnit(businessUnitId, patch),
        });
      },
    }),
    {
      name: "efp-hr-workforce",
      storage: createJSONStorage(getHrWorkforceHybridStateStorage),
      merge: (persisted, current) => {
        if (persisted == null || typeof persisted !== "object") return current;
        const p = normalizePersistedState(persisted as Partial<HrWorkforceState>);
        return {
          ...current,
          ...p,
          businessUnits:
            Array.isArray(p.businessUnits) && p.businessUnits.length > 0
              ? p.businessUnits
              : current.businessUnits,
          departments:
            Array.isArray(p.departments) && p.departments.length > 0
              ? p.departments
              : current.departments,
          teams: Array.isArray(p.teams) ? p.teams : current.teams,
          roles: Array.isArray(p.roles) ? p.roles : current.roles,
          hrGlobalSettings: migratedHrGlobalSettings(
            (p.hrGlobalSettings ?? current.hrGlobalSettings) as LegacyHrGlobal
          ),
          ohManualByBusinessUnitId:
            p.ohManualByBusinessUnitId ??
            resolveOhManualMapForUnits(
              Array.isArray(p.businessUnits) && p.businessUnits.length > 0
                ? p.businessUnits
                : current.businessUnits,
              {},
              (p.hrGlobalSettings ?? current.hrGlobalSettings) as LegacyHrGlobal
            ),
          importLogs: Array.isArray(p.importLogs) ? p.importLogs : current.importLogs,
          snapshots: Array.isArray(p.snapshots) ? p.snapshots : current.snapshots,
        };
      },
      partialize: (s) => ({
        businessUnits: s.businessUnits,
        departments: s.departments,
        teams: s.teams,
        roles: s.roles,
        hrGlobalSettings: s.hrGlobalSettings,
        ohManualByBusinessUnitId: s.ohManualByBusinessUnitId,
        importLogs: s.importLogs,
        snapshots: s.snapshots,
      }),
    }
  )
);

export { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
export { DEFAULT_HR_SETTINGS };
