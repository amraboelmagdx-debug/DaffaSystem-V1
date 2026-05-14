import type { StateCreator } from "zustand";
import type {
  HrSnapshotCompareResult,
  HrSnapshotRecord,
  HrWorkforceState,
} from "@/stores/hr-workforce/hr-workforce-store-types";
import type { HrSnapshotMeta, HrSnapshotPayloadV2 } from "@/types/hr-workforce";
import { newHrId } from "@/lib/hr-workforce/id";
import { parseHrSnapshotPayload } from "@/lib/hr-workforce/snapshot-payload";
import { migratedRoles } from "@/lib/hr-workforce/hr-workforce-persist-migrate";
import { migrateRoleOperationalType } from "@/lib/hr-workforce/role-operational-type";
import { deriveWorkspaceProjection } from "@/lib/hr-workforce/workspace-projection";
import {
  HR_WORKFORCE_ENGINE_VERSION,
  HR_WORKFORCE_FORMULA_VERSION,
} from "@/lib/hr-workforce/workspace-versions";
import { validateHrSnapshotPayloadForRestore } from "@/lib/hr-workforce/snapshot-restore";

export type HrSnapshotSlice = Pick<
  HrWorkforceState,
  | "snapshots"
  | "lastSnapshotRestoreError"
  | "clearSnapshotRestoreError"
  | "saveSnapshot"
  | "restoreSnapshot"
  | "deleteSnapshot"
  | "compareSnapshots"
>;

export const createHrSnapshotSlice: StateCreator<
  HrWorkforceState,
  [],
  [],
  HrSnapshotSlice
> = (set, get) => ({
  snapshots: [],
  lastSnapshotRestoreError: null,

  clearSnapshotRestoreError: () => set({ lastSnapshotRestoreError: null }),

  saveSnapshot: (label) => {
    const s = get();
    const meta: HrSnapshotMeta = {
      id: newHrId("snap"),
      createdAt: new Date().toISOString(),
      label: label.trim() || "Snapshot",
      engineVersion: HR_WORKFORCE_ENGINE_VERSION,
      formulaVersion: HR_WORKFORCE_FORMULA_VERSION,
    };
    const payload: HrSnapshotPayloadV2 = {
      v: 2,
      engineVersion: HR_WORKFORCE_ENGINE_VERSION,
      formulaVersion: HR_WORKFORCE_FORMULA_VERSION,
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
    if (!snap) {
      set({ lastSnapshotRestoreError: "Snapshot not found." });
      return;
    }
    let payload: HrSnapshotPayloadV2;
    try {
      payload = parseHrSnapshotPayload(snap.payloadJson);
    } catch {
      set({ lastSnapshotRestoreError: "Invalid snapshot data (JSON parse failed)." });
      return;
    }
    const check = validateHrSnapshotPayloadForRestore(payload);
    if (!check.ok) {
      set({ lastSnapshotRestoreError: check.errors.join(" ") });
      return;
    }
    const roles = migratedRoles(payload.roles, payload.hrGlobalSettings.defaultCurrency).map(
      migrateRoleOperationalType
    );
    set({
      businessUnits: payload.businessUnits,
      departments: payload.departments,
      teams: payload.teams,
      roles,
      hrGlobalSettings: payload.hrGlobalSettings,
      ohManualByBusinessUnitId: payload.ohManualByBusinessUnitId,
      lastSnapshotRestoreError: null,
    });
  },

  deleteSnapshot: (snapshotId) =>
    set({ snapshots: get().snapshots.filter((x) => x.meta.id !== snapshotId) }),

  compareSnapshots: (aId, bId): HrSnapshotCompareResult | null => {
    const s = get();
    const a = s.snapshots.find((x) => x.meta.id === aId);
    const b = s.snapshots.find((x) => x.meta.id === bId);
    if (!a || !b) return null;
    try {
      const pa = parseHrSnapshotPayload(a.payloadJson);
      const pb = parseHrSnapshotPayload(b.payloadJson);
      const headA = pa.roles.filter((r) => !r.archived).reduce((x, r) => x + r.employeeCount, 0);
      const headB = pb.roles.filter((r) => !r.archived).reduce((x, r) => x + r.employeeCount, 0);
      const ma = deriveWorkspaceProjection({
        roles: pa.roles,
        businessUnits: pa.businessUnits,
        departments: pa.departments,
        teams: pa.teams,
        hrGlobalSettings: pa.hrGlobalSettings,
        ohManualByBusinessUnitId: pa.ohManualByBusinessUnitId ?? {},
      });
      const mb = deriveWorkspaceProjection({
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
});
