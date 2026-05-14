"use client";

import { useMemo } from "react";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { catalogSliceFromStore } from "@/lib/service-cost-simulation/hr-input";
import type { ServiceCostCatalogSlice } from "@/lib/service-cost-simulation/types";

/**
 * Stable catalog slice for cost/pricing views. Avoids `getSnapshot` infinite loops from
 * selectors that return a fresh object each time (React 19 / useSyncExternalStore).
 */
export function useServiceCostCatalogSlice(): ServiceCostCatalogSlice {
  const serviceTemplates = useServiceArchitectureStore((s) => s.serviceTemplates);
  const serviceTiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const serviceTemplateTiers = useServiceArchitectureStore((s) => s.serviceTemplateTiers);
  const deliveryPhases = useServiceArchitectureStore((s) => s.deliveryPhases);
  const serviceTemplateTierPhases = useServiceArchitectureStore((s) => s.serviceTemplateTierPhases);
  const serviceDeliverables = useServiceArchitectureStore((s) => s.serviceDeliverables);
  const serviceRoleAllocations = useServiceArchitectureStore((s) => s.serviceRoleAllocations);

  return useMemo(
    () =>
      catalogSliceFromStore({
        serviceTemplates,
        serviceTiers,
        serviceTemplateTiers,
        deliveryPhases,
        serviceTemplateTierPhases,
        serviceDeliverables,
        serviceRoleAllocations,
      }),
    [
      serviceTemplates,
      serviceTiers,
      serviceTemplateTiers,
      deliveryPhases,
      serviceTemplateTierPhases,
      serviceDeliverables,
      serviceRoleAllocations,
    ]
  );
}
