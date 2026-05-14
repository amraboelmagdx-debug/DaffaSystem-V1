import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  OhManualSettings,
} from "@/types/hr-workforce";
import { newHrId } from "@/lib/hr-workforce/id";
import type { ImportApplyDeltas } from "@/lib/hr-workforce/import-dry-run";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import { migrateRoleOperationalType } from "@/lib/hr-workforce/role-operational-type";
import { nowIso } from "@/lib/hr-workforce/structure-utils";
import { seedDemoWorkforceIfEmpty, type DemoWorkforceSeedResult } from "@/lib/hr-workforce/demo-workforce-seed";
import { getHrWorkforceHybridStateStorage } from "@/lib/hr-workforce/hr-workforce-hybrid-persist-storage";
import {
  DEFAULT_HR_SETTINGS,
  type LegacyHrGlobal,
  migrateOhManualFromPersist,
  migratedHrGlobalSettings,
  migratedRoleCurrency,
  migratedRoles,
  resolveOhManualMapForUnits,
} from "@/lib/hr-workforce/hr-workforce-persist-migrate";
import type { HrWorkforceState } from "@/stores/hr-workforce/hr-workforce-store-types";
import { createHrImportSlice, getImportSliceResetPayload } from "@/stores/hr-workforce/slices/hr-import-slice";
import { createHrSnapshotSlice } from "@/stores/hr-workforce/slices/hr-snapshot-slice";

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
    (set, get, store) => ({
      ...createHrImportSlice(set, get, store),
      ...createHrSnapshotSlice(set, get, store),

      businessUnits: seed.businessUnits,
      departments: seed.departments,
      teams: seed.teams,
      roles: [],
      hrGlobalSettings: { ...DEFAULT_HR_SETTINGS },
      ohManualByBusinessUnitId: { ...initialOhManualByBusinessUnitId },

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

      resetModule: () => {
        const org = seedOrg();
        set({
          businessUnits: org.businessUnits,
          departments: org.departments,
          teams: org.teams,
          roles: [],
          hrGlobalSettings: { ...DEFAULT_HR_SETTINGS },
          ohManualByBusinessUnitId: { [org.businessUnits[0].id]: { ...DEFAULT_OH } },
          snapshots: [],
          lastSnapshotRestoreError: null,
          ...getImportSliceResetPayload(),
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
export { DEFAULT_HR_SETTINGS } from "@/lib/hr-workforce/hr-workforce-persist-migrate";
export { parseHrSnapshotPayload } from "@/lib/hr-workforce/snapshot-payload";
export type { HrSnapshotRecord, HrSnapshotCompareResult } from "@/stores/hr-workforce/hr-workforce-store-types";
