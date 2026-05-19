"use client";

import { useMemo } from "react";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { resolveBusinessUnitIdForCompany } from "@/lib/platform-economics/operational-unit";

export type UnitScope = {
  companyId: string | null;
  hrBusinessUnitId: string | null;
  unitLabel: string;
  isUnitScoped: boolean;
  prefix: string;
  buildHref: (path: string) => string;
};

export function useUnitScope(): UnitScope {
  const { companyId, isUnitScoped, prefix, buildHref } = useUnitRouteContext();
  const { linkedUnits } = useOperationalWorkspace();
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);

  return useMemo(() => {
    const unit = companyId
      ? linkedUnits.find((u) => u.id === companyId)
      : undefined;
    const hrBusinessUnitId = companyId
      ? resolveBusinessUnitIdForCompany(companyId, linkedUnits) ?? null
      : null;
    const hrBu = hrBusinessUnitId
      ? businessUnits.find((b) => b.id === hrBusinessUnitId)
      : undefined;
    const unitLabel = hrBu?.name ?? unit?.name ?? "";

    return {
      companyId,
      hrBusinessUnitId,
      unitLabel,
      isUnitScoped,
      prefix,
      buildHref,
    };
  }, [
    companyId,
    isUnitScoped,
    prefix,
    buildHref,
    linkedUnits,
    businessUnits,
  ]);
}
