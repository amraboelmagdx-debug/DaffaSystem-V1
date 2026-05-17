"use client";

import { createContext, useContext } from "react";
import { HR_HYDRATION_IDLE, type HrHydrationResult } from "@/lib/persistence/hydrate-hr-catalog";
import {
  getHrCatalogSyncState,
  type HrCatalogSyncState,
} from "@/lib/persistence/hr-catalog-sync-state";

export type TenantPersistenceContextValue = {
  organizationId: string | null;
  organizationName: string | null;
  isHydratingEconomics: boolean;
  hrHydration: HrHydrationResult;
  hrSync: HrCatalogSyncState;
  switchOrganization: (organizationId: string) => Promise<void>;
};

const defaultValue: TenantPersistenceContextValue = {
  organizationId: null,
  organizationName: null,
  isHydratingEconomics: true,
  hrHydration: HR_HYDRATION_IDLE,
  hrSync: getHrCatalogSyncState(),
  switchOrganization: async () => {
    throw new Error("TenantPersistenceProvider is not mounted");
  },
};

export const TenantPersistenceContext = createContext<TenantPersistenceContextValue>(defaultValue);

export function useTenantPersistenceContext(): TenantPersistenceContextValue {
  return useContext(TenantPersistenceContext);
}
