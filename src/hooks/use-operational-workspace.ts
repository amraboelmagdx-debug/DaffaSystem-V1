"use client";

import { useEffect, useMemo, useRef } from "react";

import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { coerceErrorMessages } from "@/lib/platform-economics/parse-planning-sync-response";
import { partitionOperationalUnits } from "@/lib/platform-economics/operational-unit";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { DemoCompany } from "@/types/domain";

const SINGLE_BU_AUTO_SELECT_KEY = "efp-single-bu-auto-selected";

export function useOperationalWorkspace() {
  const {
    isHydratingEconomics,
    workspaceBootstrap,
    retryWorkspaceBootstrap,
  } = useTenantPersistenceContext();

  const companies = useWorkspaceStore((s) => s.companies);
  const selectedCompanyId = useWorkspaceStore((s) => s.selectedCompanyId);
  const setCompany = useWorkspaceStore((s) => s.setCompany);
  const clearOperationalContext = useWorkspaceStore((s) => s.clearOperationalContext);

  const hrActiveBuCount = useHrWorkforceStore(
    (s) => s.businessUnits.filter((b) => b.isActive).length
  );

  const { linked, orphans } = useMemo(
    () => partitionOperationalUnits(companies),
    [companies]
  );

  const selectedUnit: DemoCompany | null = useMemo(() => {
    if (!selectedCompanyId.trim()) return null;
    return linked.find((c) => c.id === selectedCompanyId) ?? null;
  }, [linked, selectedCompanyId]);

  const hasExplicitOperationalContext = selectedUnit != null;

  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (isHydratingEconomics || didAutoSelectRef.current) return;
    if (selectedCompanyId.trim()) return;
    if (linked.length !== 1) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(SINGLE_BU_AUTO_SELECT_KEY)) {
      return;
    }
    const only = linked[0];
    if (!only) return;
    didAutoSelectRef.current = true;
    setCompany(only.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SINGLE_BU_AUTO_SELECT_KEY, only.id);
    }
  }, [isHydratingEconomics, linked, selectedCompanyId, setCompany]);

  const bootstrapError =
    workspaceBootstrap && workspaceBootstrap.linkedUnitCount === 0 && hrActiveBuCount > 0
      ? coerceErrorMessages(workspaceBootstrap.errors).join("; ") ||
        "Planning workspace sync did not create linked units."
      : null;

  const authRequired = Boolean(workspaceBootstrap?.authRequired);

  const isReady = !isHydratingEconomics;

  return {
    isReady,
    isHydrating: isHydratingEconomics,
    linkedUnits: linked,
    orphanUnits: orphans,
    selectedUnit,
    selectedCompanyId,
    hasExplicitOperationalContext,
    setCompany,
    clearOperationalContext,
    hrActiveBuCount,
    workspaceBootstrap,
    bootstrapError,
    authRequired,
    retryWorkspaceBootstrap,
  };
}
