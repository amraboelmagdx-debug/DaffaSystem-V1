"use client";

import { useMemo } from "react";
import {
  getEffectiveCompanyForPlanning,
  tierLineOverridesForActiveScenario,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";
import type { DemoCompany } from "@/types/domain";
import type { TierLine } from "@/lib/planning/workbook-engine";

export function useActivePlanningInputs(companyId: string | undefined): {
  company: DemoCompany | undefined;
  tierLineOverrides: Record<string, TierLine[]>;
} {
  const companies = useWorkspaceStore((s) => s.companies);
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const globalTiers = useWorkspaceStore((s) => s.tierLineOverrides);

  return useMemo(() => {
    if (!companyId) {
      return { company: undefined, tierLineOverrides: {} };
    }
    const state = useWorkspaceStore.getState();
    const company = getEffectiveCompanyForPlanning(
      { companies, scenarioBundles, selectedScenarioId },
      companyId
    );
    const tierLineOverrides =
      state.scenarioBundles[selectedScenarioId]?.tierLineOverrides ??
      tierLineOverridesForActiveScenario();
    return { company, tierLineOverrides };
  }, [companies, scenarioBundles, selectedScenarioId, globalTiers, companyId]);
}
