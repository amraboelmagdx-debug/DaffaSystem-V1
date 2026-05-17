"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  bootstrapActiveOrganizationFromClientHint,
  bootstrapActiveOrganizationFromPublicDevEnv,
} from "@/lib/persistence/active-tenant";
import { TenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import {
  flushHrCatalogSync,
  setHrCatalogSyncPaused,
  uninstallHrCatalogDualWrite,
} from "@/lib/persistence/hr-catalog-dual-write";
import {
  flushServiceCatalogSync,
  setServiceCatalogSyncPaused,
  uninstallServiceCatalogDualWrite,
} from "@/lib/persistence/service-catalog-dual-write";
import { finishHrCatalogPersistenceSetup } from "@/lib/persistence/finish-hr-catalog-persistence-setup";
import { finishServiceCatalogPersistenceSetup } from "@/lib/persistence/finish-service-catalog-persistence-setup";
import {
  type HrHydrationResult,
  HR_HYDRATION_IDLE,
} from "@/lib/persistence/hydrate-hr-catalog";
import {
  type ServiceHydrationResult,
  SERVICE_HYDRATION_IDLE,
} from "@/lib/persistence/hydrate-service-catalog";
import {
  getHrCatalogSyncState,
  subscribeHrCatalogSyncState,
  type HrCatalogSyncState,
} from "@/lib/persistence/hr-catalog-sync-state";
import {
  getServiceCatalogSyncState,
  subscribeServiceCatalogSyncState,
  type ServiceCatalogSyncState,
} from "@/lib/persistence/service-catalog-sync-state";
import { installHrHydrationDebugGlobal } from "@/lib/persistence/hr-hydration-debug";
import { prepareEconomicsStoresForOrganization } from "@/lib/persistence/hydrate-economics-stores";
import { switchActiveOrganization } from "@/lib/persistence/switch-active-organization";
import { fetchTenantContextClient } from "@/lib/persistence/tenant-context-client";

function bootstrapActiveOrganizationBeforeChildren(): void {
  if (typeof window === "undefined") return;
  bootstrapActiveOrganizationFromPublicDevEnv();
  bootstrapActiveOrganizationFromClientHint();
}

export function TenantPersistenceProvider({ children }: { children: ReactNode }) {
  bootstrapActiveOrganizationBeforeChildren();

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [isHydratingEconomics, setIsHydratingEconomics] = useState(true);
  const [hrHydration, setHrHydration] = useState<HrHydrationResult>(HR_HYDRATION_IDLE);
  const [hrSync, setHrSync] = useState<HrCatalogSyncState>(() => getHrCatalogSyncState());
  const [saHydration, setSaHydration] = useState<ServiceHydrationResult>(SERVICE_HYDRATION_IDLE);
  const [saSync, setSaSync] = useState<ServiceCatalogSyncState>(() => getServiceCatalogSyncState());

  useEffect(() => subscribeHrCatalogSyncState(setHrSync), []);
  useEffect(() => subscribeServiceCatalogSyncState(setSaSync), []);

  useEffect(() => {
    const onPageHide = () => {
      void flushHrCatalogSync(undefined, { keepalive: true });
      void flushServiceCatalogSync(undefined, { keepalive: true });
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    };
  }, []);

  useEffect(() => {
    return () => {
      uninstallHrCatalogDualWrite();
      uninstallServiceCatalogDualWrite();
    };
  }, []);

  const hydrateForOrganization = useCallback(async (orgId: string, orgName?: string) => {
    setIsHydratingEconomics(true);
    setHrCatalogSyncPaused(true);
    setServiceCatalogSyncPaused(true);
    setHrHydration({ ...HR_HYDRATION_IDLE, status: "loading" });
    setSaHydration({ ...SERVICE_HYDRATION_IDLE, status: "loading" });
    try {
      const result = await prepareEconomicsStoresForOrganization(orgId);
      setHrHydration(result.hr);
      setSaHydration(result.sa);
      setOrganizationId(orgId);
      setOrganizationName(orgName ?? null);
      await finishHrCatalogPersistenceSetup(orgId, result.hr);
      await finishServiceCatalogPersistenceSetup(orgId, result.sa);
    } catch (err) {
      setHrHydration({
        status: "error",
        source: "local",
        errorMessage: err instanceof Error ? err.message : "Hydration failed",
        pendingUplift: false,
      });
      setHrCatalogSyncPaused(false);
      setServiceCatalogSyncPaused(false);
    } finally {
      setIsHydratingEconomics(false);
    }
  }, []);

  useEffect(() => {
    installHrHydrationDebugGlobal();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const ctx = await fetchTenantContextClient();
        if (cancelled) return;
        if (ctx?.activeOrganizationId) {
          await hydrateForOrganization(ctx.activeOrganizationId, ctx.activeOrganizationName);
        } else {
          setIsHydratingEconomics(false);
          setHrHydration(HR_HYDRATION_IDLE);
          setHrCatalogSyncPaused(false);
          setServiceCatalogSyncPaused(false);
        }
      } catch {
        if (!cancelled) {
          setIsHydratingEconomics(false);
          setHrHydration(HR_HYDRATION_IDLE);
          setSaHydration(SERVICE_HYDRATION_IDLE);
          setHrCatalogSyncPaused(false);
          setServiceCatalogSyncPaused(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateForOrganization]);

  const switchOrganization = useCallback(
    async (nextOrganizationId: string) => {
      setIsHydratingEconomics(true);
      setHrCatalogSyncPaused(true);
      setServiceCatalogSyncPaused(true);
      setHrHydration({ ...HR_HYDRATION_IDLE, status: "loading" });
      setSaHydration({ ...SERVICE_HYDRATION_IDLE, status: "loading" });
      try {
        const result = await switchActiveOrganization(nextOrganizationId);
        setOrganizationId(result.activeOrganizationId);
        setOrganizationName(result.activeOrganizationName ?? null);
        setHrHydration(result.economics.hr);
        setSaHydration(result.economics.sa);
        await finishHrCatalogPersistenceSetup(
          result.activeOrganizationId,
          result.economics.hr
        );
        await finishServiceCatalogPersistenceSetup(
          result.activeOrganizationId,
          result.economics.sa
        );
      } catch (err) {
        setHrHydration({
          status: "error",
          source: "local",
          errorMessage: err instanceof Error ? err.message : "Organization switch failed",
          pendingUplift: false,
        });
        setHrCatalogSyncPaused(false);
        setServiceCatalogSyncPaused(false);
        throw err;
      } finally {
        setIsHydratingEconomics(false);
      }
    },
    []
  );

  return (
    <TenantPersistenceContext.Provider
      value={{
        organizationId,
        organizationName,
        isHydratingEconomics,
        hrHydration,
        hrSync,
        saHydration,
        saSync,
        switchOrganization,
      }}
    >
      {children}
    </TenantPersistenceContext.Provider>
  );
}
