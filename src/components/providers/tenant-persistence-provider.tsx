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
import {
  installPlatformDebugGlobal,
  patchPlatformDebug,
  recordHydrationStep,
} from "@/lib/persistence/platform-persistence-debug";
import { coalesceEconomicsHydration } from "@/lib/persistence/economics-hydration-flight";
import { prepareEconomicsStoresForOrganization } from "@/lib/persistence/hydrate-economics-stores";
import { switchActiveOrganization } from "@/lib/persistence/switch-active-organization";
import { fetchTenantContextClient } from "@/lib/persistence/tenant-context-client";
import { bootstrapOperationalWorkspaceFromHr } from "@/lib/platform-economics/bootstrap-operational-workspace";
import type { OperationalWorkspaceBootstrapResult } from "@/lib/platform-economics/bootstrap-operational-workspace";
import { emitPilotConfigWarnings } from "@/lib/persistence/pilot-config-warnings";

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
  const [workspaceBootstrap, setWorkspaceBootstrap] =
    useState<OperationalWorkspaceBootstrapResult | null>(null);

  useEffect(() => subscribeHrCatalogSyncState(setHrSync), []);
  useEffect(() => subscribeServiceCatalogSyncState(setSaSync), []);
  useEffect(() => {
    emitPilotConfigWarnings();
  }, []);

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
    await coalesceEconomicsHydration(orgId, async () => {
      // #region agent log
      fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
        body: JSON.stringify({
          sessionId: "f77448",
          hypothesisId: "B,E",
          location: "tenant-persistence-provider.tsx:hydrateForOrganization:start",
          message: "hydrateForOrganization started",
          data: { orgId },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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
        // #region agent log
        fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
          body: JSON.stringify({
            sessionId: "f77448",
            hypothesisId: "B",
            location: "tenant-persistence-provider.tsx:hydrateForOrganization:afterPrepare",
            message: "prepareEconomicsStores completed",
            data: { orgId },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        await finishHrCatalogPersistenceSetup(orgId, result.hr);
        // #region agent log
        fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
          body: JSON.stringify({
            sessionId: "f77448",
            hypothesisId: "B",
            location: "tenant-persistence-provider.tsx:hydrateForOrganization:afterFinishHr",
            message: "finishHrCatalogPersistenceSetup completed",
            data: { orgId },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        await finishServiceCatalogPersistenceSetup(orgId, result.sa);
        // #region agent log
        fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
          body: JSON.stringify({
            sessionId: "f77448",
            hypothesisId: "G",
            location: "tenant-persistence-provider.tsx:hydrateForOrganization:afterFinishSa",
            message: "finishServiceCatalogPersistenceSetup completed",
            data: { orgId },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        setIsHydratingEconomics(false);
        const bootstrap = await bootstrapOperationalWorkspaceFromHr(orgId);
        // #region agent log
        fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
          body: JSON.stringify({
            sessionId: "f77448",
            hypothesisId: "G",
            location: "tenant-persistence-provider.tsx:hydrateForOrganization:afterBootstrap",
            message: "bootstrapOperationalWorkspaceFromHr completed",
            data: { orgId, linkedUnits: bootstrap.linkedUnitCount },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        setWorkspaceBootstrap(bootstrap);
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
        // #region agent log
        fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
          body: JSON.stringify({
            sessionId: "f77448",
            hypothesisId: "B,E",
            location: "tenant-persistence-provider.tsx:hydrateForOrganization:finally",
            message: "hydrateForOrganization finished — clearing isHydratingEconomics",
            data: { orgId },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        setIsHydratingEconomics(false);
        setHrCatalogSyncPaused(false);
        setServiceCatalogSyncPaused(false);
      }
    });
  }, []);

  useEffect(() => {
    installHrHydrationDebugGlobal();
    installPlatformDebugGlobal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const effectId = Math.random().toString(36).slice(2, 8);
    // #region agent log
    fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
      body: JSON.stringify({
        sessionId: "f77448",
        hypothesisId: "A",
        location: "tenant-persistence-provider.tsx:initEffect:mount",
        message: "initial hydrate effect mounted",
        data: { effectId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    void (async () => {
      try {
        const ctx = await fetchTenantContextClient();
        // #region agent log
        fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
          body: JSON.stringify({
            sessionId: "f77448",
            hypothesisId: "A,C",
            location: "tenant-persistence-provider.tsx:initEffect:afterFetch",
            message: "tenant context fetch resolved",
            data: {
              effectId,
              cancelled,
              hasOrg: Boolean(ctx?.activeOrganizationId),
              orgId: ctx?.activeOrganizationId ?? null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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
      // #region agent log
      fetch("http://127.0.0.1:7809/ingest/ebe5ab7e-6741-479f-b910-4578b2ccf986", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f77448" },
        body: JSON.stringify({
          sessionId: "f77448",
          hypothesisId: "A",
          location: "tenant-persistence-provider.tsx:initEffect:cleanup",
          message: "initial hydrate effect cleanup (cancelled=true)",
          data: { effectId },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
  }, [hydrateForOrganization]);

  const switchOrganization = useCallback(
    async (nextOrganizationId: string) => {
      await coalesceEconomicsHydration(nextOrganizationId, async () => {
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
        const bootstrap = await bootstrapOperationalWorkspaceFromHr(result.activeOrganizationId);
        setWorkspaceBootstrap(bootstrap);
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
        setHrCatalogSyncPaused(false);
        setServiceCatalogSyncPaused(false);
      }
      });
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
        workspaceBootstrap,
        retryWorkspaceBootstrap: async () => {
          if (!organizationId) return;
          const bootstrap = await bootstrapOperationalWorkspaceFromHr(organizationId);
          setWorkspaceBootstrap(bootstrap);
        },
        switchOrganization,
      }}
    >
      {children}
    </TenantPersistenceContext.Provider>
  );
}
