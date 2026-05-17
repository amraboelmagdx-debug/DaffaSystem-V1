"use client";

import { createContext, useContext } from "react";
import { HR_HYDRATION_IDLE, type HrHydrationResult } from "@/lib/persistence/hydrate-hr-catalog";
import {
  getHrCatalogSyncState,
  type HrCatalogSyncState,
} from "@/lib/persistence/hr-catalog-sync-state";
import {
  SERVICE_HYDRATION_IDLE,
  type ServiceHydrationResult,
} from "@/lib/persistence/hydrate-service-catalog";
import {
  getServiceCatalogSyncState,
  type ServiceCatalogSyncState,
} from "@/lib/persistence/service-catalog-sync-state";
import type { OperationalWorkspaceBootstrapResult } from "@/lib/platform-economics/bootstrap-operational-workspace";

export type TenantPersistenceContextValue = {
  organizationId: string | null;
  organizationName: string | null;
  isHydratingEconomics: boolean;
  hrHydration: HrHydrationResult;
  hrSync: HrCatalogSyncState;
  saHydration: ServiceHydrationResult;
  saSync: ServiceCatalogSyncState;
  workspaceBootstrap: OperationalWorkspaceBootstrapResult | null;
  retryWorkspaceBootstrap: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
};

const defaultValue: TenantPersistenceContextValue = {
  organizationId: null,
  organizationName: null,
  isHydratingEconomics: true,
  hrHydration: HR_HYDRATION_IDLE,
  hrSync: getHrCatalogSyncState(),
  saHydration: SERVICE_HYDRATION_IDLE,
  saSync: getServiceCatalogSyncState(),
  workspaceBootstrap: null,
  retryWorkspaceBootstrap: async () => {
    throw new Error("TenantPersistenceProvider is not mounted");
  },
  switchOrganization: async () => {
    throw new Error("TenantPersistenceProvider is not mounted");
  },
};

export const TenantPersistenceContext = createContext<TenantPersistenceContextValue>(defaultValue);

export function useTenantPersistenceContext(): TenantPersistenceContextValue {
  return useContext(TenantPersistenceContext);
}
