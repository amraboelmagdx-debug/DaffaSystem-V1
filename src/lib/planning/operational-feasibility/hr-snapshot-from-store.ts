import type { HrWorkforceSnapshot } from "@/types/operational-feasibility";

type HrStoreSlice = {
  roles: HrWorkforceSnapshot["roles"];
  businessUnits: HrWorkforceSnapshot["businessUnits"];
  departments: HrWorkforceSnapshot["departments"];
  teams: HrWorkforceSnapshot["teams"];
  hrGlobalSettings: HrWorkforceSnapshot["hrGlobalSettings"];
  ohManualByBusinessUnitId: HrWorkforceSnapshot["ohManualByBusinessUnitId"];
};

export function hrSnapshotFromStore(state: HrStoreSlice): HrWorkforceSnapshot {
  return {
    roles: state.roles,
    businessUnits: state.businessUnits,
    departments: state.departments,
    teams: state.teams,
    hrGlobalSettings: state.hrGlobalSettings,
    ohManualByBusinessUnitId: state.ohManualByBusinessUnitId,
  };
}

/** v1: sums allocation hours by tier-phase id (stream template link is best-effort). */
export function serviceHoursByTemplateIdFromAllocations(
  allocations: { serviceTemplateTierPhaseId: string; allocatedHours: number }[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of allocations) {
    const id = row.serviceTemplateTierPhaseId?.trim();
    if (!id) continue;
    map[id] = (map[id] ?? 0) + Math.max(0, row.allocatedHours);
  }
  return map;
}
