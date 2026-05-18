"use client";

import { useShallow } from "zustand/react/shallow";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

/** Stable HR slice for planning/feasibility engines — avoids infinite useSyncExternalStore loops. */
export function useHrWorkforceSnapshotSlice() {
  return useHrWorkforceStore(
    useShallow((s) => ({
      roles: s.roles,
      businessUnits: s.businessUnits,
      departments: s.departments,
      teams: s.teams,
      hrGlobalSettings: s.hrGlobalSettings,
      ohManualByBusinessUnitId: s.ohManualByBusinessUnitId,
    }))
  );
}
