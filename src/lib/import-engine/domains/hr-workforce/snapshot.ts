import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  OhManualSettings,
} from "@/types/hr-workforce";

/** Read-only snapshot consumed by HR adapter buildTemplate + planUpload. */
export interface HrSnapshot {
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  roles: JobRole[];
  globalSettings: HrGlobalSettings;
  ohManualByBusinessUnitId: Record<string, OhManualSettings>;
}
