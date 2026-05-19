"use client";

import { useMemo } from "react";
import { filterTemplatesForBusinessUnit } from "@/lib/service-economics/resolve-graph";
import { useUnitScope } from "@/hooks/use-unit-scope";
import type { ServiceTemplate } from "@/types/service-architecture";

/** Templates visible in the current route: all tenant templates, or only the active BU when unit-scoped. */
export function useScopedServiceTemplates(templates: ServiceTemplate[]) {
  const { isUnitScoped, hrBusinessUnitId } = useUnitScope();
  return useMemo(
    () =>
      filterTemplatesForBusinessUnit(
        templates,
        isUnitScoped ? hrBusinessUnitId ?? undefined : undefined
      ),
    [templates, isUnitScoped, hrBusinessUnitId]
  );
}
