import type { ImportApplyDeltas, ImportPlanResult } from "@/lib/hr-workforce/import-dry-run";
import type { ImportColumnKey, ParsedImportRow } from "@/lib/hr-workforce/import-parser";
import type { DemoWorkforceSeedResult } from "@/lib/hr-workforce/demo-workforce-seed";
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

export interface HrSnapshotRecord {
  meta: HrSnapshotMeta;
  payloadJson: string;
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

/** Full HR workforce Zustand store shape (composed from slices over time). */
export interface HrWorkforceState {
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  roles: JobRole[];
  hrGlobalSettings: HrGlobalSettings;
  ohManualByBusinessUnitId: Record<string, OhManualSettings>;
  importLogs: HrImportLogEntry[];
  /** Ephemeral import UI / session (not persisted). */
  importSessionFileName: string;
  importSessionHeaders: string[];
  importSessionRows: ParsedImportRow[];
  importSessionColumnMap: Partial<Record<ImportColumnKey, string>>;
  importSessionErrors: string[];
  importSessionPlan: ImportPlanResult | null;
  /** ISO timestamp of last dry-run attempt (success or failure). */
  importSessionLastDryRunAt: string | null;
  importSessionReplaceExisting: boolean;
  snapshots: HrSnapshotRecord[];

  /** Session-only: last failed snapshot restore message (not persisted). */
  lastSnapshotRestoreError: string | null;
  clearSnapshotRestoreError: () => void;

  setHrGlobalSettings: (patch: Partial<HrGlobalSettings>) => void;
  setOhManualForBusinessUnit: (businessUnitId: string, patch: Partial<OhManualSettings>) => void;

  addBusinessUnit: (p: { name: string; code?: string; description?: string }) => HrBusinessUnit;
  updateBusinessUnit: (id: string, patch: Partial<HrBusinessUnit>) => void;

  addDepartment: (businessUnitId: string, name: string) => HrDepartment;
  updateDepartment: (id: string, patch: Partial<HrDepartment>) => void;

  addTeam: (departmentId: string, name: string) => HrTeam;
  updateTeam: (id: string, patch: Partial<HrTeam>) => void;
  deleteBusinessUnit: (id: string) => void;
  deleteDepartment: (id: string) => void;
  deleteTeam: (id: string) => void;

  upsertRole: (role: JobRole) => void;
  addRole: (partial: Partial<Omit<JobRole, "id">> & { departmentId: string }) => JobRole;
  updateRole: (id: string, patch: Partial<JobRole>) => void;
  duplicateRole: (id: string) => void;
  archiveRole: (id: string, archived: boolean) => void;
  deleteRole: (id: string) => void;
  bulkPatchRoles: (ids: string[], patch: Partial<JobRole>) => void;
  bulkDeleteRoles: (ids: string[]) => void;

  applyImportDeltas: (deltas: ImportApplyDeltas, options?: { replace?: boolean }) => void;
  pushImportLog: (entry: Omit<HrImportLogEntry, "id" | "createdAt"> & Partial<Pick<HrImportLogEntry, "id" | "createdAt">>) => void;
  deleteImportLog: (logId: string) => void;
  clearAllImportLogs: () => void;
  importSessionLoadParsed: (payload: {
    fileName: string;
    headers: string[];
    rows: ParsedImportRow[];
    columnMap: Partial<Record<ImportColumnKey, string>>;
  }) => void;
  importSessionSetColumnMapping: (key: ImportColumnKey, sheetHeader: string | undefined) => void;
  importSessionSetReplaceExisting: (replace: boolean) => void;
  importSessionRunDryRun: () => void;
  importSessionClearAfterSuccessfulCommit: () => void;

  saveSnapshot: (label: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  compareSnapshots: (aId: string, bId: string) => HrSnapshotCompareResult | null;

  resetModule: () => void;
  seedDemoWorkforce: () => DemoWorkforceSeedResult;
}
