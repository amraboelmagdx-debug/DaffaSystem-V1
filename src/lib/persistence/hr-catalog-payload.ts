import type { HrWorkforceState } from "@/stores/hr-workforce/hr-workforce-store-types";
import type { HrWorkforceCatalogPayload } from "@/server/validation/hr-catalog-schema";

/** Mirrors Zustand HR store `partialize` — single source for local persist and server PUT. */
/** Stable fingerprint for sync / hydrate comparisons (same shape as PUT payload). */
export function fingerprintHrCatalog(catalog: HrWorkforceCatalogPayload): string {
  return JSON.stringify(catalog);
}

export function partializeHrCatalogFromState(
  state: Pick<
    HrWorkforceState,
    | "businessUnits"
    | "departments"
    | "teams"
    | "roles"
    | "hrGlobalSettings"
    | "ohManualByBusinessUnitId"
    | "importLogs"
    | "snapshots"
  >
): HrWorkforceCatalogPayload {
  return {
    businessUnits: state.businessUnits,
    departments: state.departments,
    teams: state.teams,
    roles: state.roles,
    hrGlobalSettings: state.hrGlobalSettings,
    ohManualByBusinessUnitId: state.ohManualByBusinessUnitId,
    importLogs: state.importLogs,
    snapshots: state.snapshots,
  } as HrWorkforceCatalogPayload;
}
