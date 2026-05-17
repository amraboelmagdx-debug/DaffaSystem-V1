"use client";

import { useMemo } from "react";

import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { coerceErrorMessages } from "@/lib/platform-economics/parse-planning-sync-response";
import { partitionOperationalUnits } from "@/lib/platform-economics/operational-unit";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { DemoCompany } from "@/types/domain";

export function useOperationalWorkspace() {
  const {
    isHydratingEconomics,
    workspaceBootstrap,
    retryWorkspaceBootstrap,
  } = useTenantPersistenceContext();

  const companies = useWorkspaceStore((s) => s.companies);
  const selectedCompanyId = useWorkspaceStore((s) => s.selectedCompanyId);
  const setCompany = useWorkspaceStore((s) => s.setCompany);

  const hrActiveBuCount = useHrWorkforceStore(
    (s) => s.businessUnits.filter((b) => b.isActive).length
  );

  const { linked, orphans } = useMemo(
    () => partitionOperationalUnits(companies),
    [companies]
  );

  const selectedUnit: DemoCompany | null = useMemo(() => {
    const fromSelection = linked.find((c) => c.id === selectedCompanyId);
    if (fromSelection) return fromSelection;
    return linked[0] ?? null;
  }, [linked, selectedCompanyId]);

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
    selectedCompanyId: selectedUnit?.id ?? "",
    setCompany,
    hrActiveBuCount,
    workspaceBootstrap,
    bootstrapError,
    authRequired,
    retryWorkspaceBootstrap,
  };
}
