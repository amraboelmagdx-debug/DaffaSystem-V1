"use client";

import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";

export function useActiveOrganization() {
  const {
    organizationId,
    organizationName,
    isHydratingEconomics,
    hrHydration,
    hrSync,
    switchOrganization,
  } = useTenantPersistenceContext();

  return {
    organizationId,
    organizationName,
    isHydratingEconomics,
    hrHydration,
    hrSync,
    switchOrganization,
  };
}
