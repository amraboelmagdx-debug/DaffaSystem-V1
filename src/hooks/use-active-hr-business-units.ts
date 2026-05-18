"use client";

import { useMemo } from "react";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

/** Active HR business units — never `.filter()` inside the store selector (new array each read). */
export function useActiveHrBusinessUnits() {
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  return useMemo(
    () => businessUnits.filter((b) => b.isActive),
    [businessUnits]
  );
}
