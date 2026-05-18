"use client";

import { useMemo } from "react";
import {
  buildFeasibilityEvalContext,
  compareOperationalFeasibility,
  evaluateOperationalFeasibility,
} from "@/lib/planning/operational-feasibility";
import {
  hrSnapshotFromStore,
  serviceHoursByTemplateIdFromAllocations,
} from "@/lib/planning/operational-feasibility/hr-snapshot-from-store";
import { useFeasibilityNarrativeLabels } from "@/lib/planning/scenario/use-feasibility-narrative-labels";
import type {
  OperationalFeasibilityComparison,
  OperationalFeasibilityResult,
} from "@/types/operational-feasibility";
import type { CompareScenariosInput, ScenarioComparisonResult } from "@/types/scenario-comparison";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream } from "@/types/domain";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";

export type UseOperationalFeasibilityInput = {
  anchorCompany: DemoCompany | null | undefined;
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  scenarioBundles: Record<string, ScenarioPlanningBundle>;
  activeScenarioId: string;
  baseScenarioId?: string;
  compareScenarioId?: string;
  comparison?: ScenarioComparisonResult | null;
  compareMode?: boolean;
  enabled?: boolean;
};

export type OperationalFeasibilityPhase =
  | { phase: "idle" }
  | { phase: "blocked"; reason: "no_company" | "missing_bundle" }
  | { phase: "ready"; result: OperationalFeasibilityResult }
  | { phase: "compare_ready"; result: OperationalFeasibilityComparison };

export function useOperationalFeasibility(
  input: UseOperationalFeasibilityInput
): OperationalFeasibilityPhase {
  const labels = useFeasibilityNarrativeLabels();
  const hrSlice = useHrWorkforceStore((s) => ({
    roles: s.roles,
    businessUnits: s.businessUnits,
    departments: s.departments,
    teams: s.teams,
    hrGlobalSettings: s.hrGlobalSettings,
    ohManualByBusinessUnitId: s.ohManualByBusinessUnitId,
  }));
  const serviceRoleAllocations = useServiceArchitectureStore((s) => s.serviceRoleAllocations);

  const {
    anchorCompany,
    streams,
    opportunities,
    scenarioBundles,
    activeScenarioId,
    baseScenarioId = "",
    compareScenarioId = "",
    comparison,
    compareMode = false,
    enabled = true,
  } = input;

  const hrSnapshot = useMemo(() => hrSnapshotFromStore(hrSlice), [hrSlice]);
  const serviceHoursByTemplateId = useMemo(
    () => serviceHoursByTemplateIdFromAllocations(serviceRoleAllocations),
    [serviceRoleAllocations]
  );

  return useMemo(() => {
    if (!enabled) return { phase: "idle" as const };
    if (!anchorCompany) return { phase: "blocked" as const, reason: "no_company" as const };

    if (compareMode && comparison && baseScenarioId && compareScenarioId) {
      const context: CompareScenariosInput = {
        anchorCompany,
        streams,
        opportunities,
        bundlesById: scenarioBundles,
        baseScenarioId,
        compareScenarioId,
      };
      const result = compareOperationalFeasibility(
        { comparison, context, hrSnapshot, serviceHoursByTemplateId },
        labels
      );
      return { phase: "compare_ready" as const, result };
    }

    const bundle = scenarioBundles[activeScenarioId];
    if (!bundle) return { phase: "blocked" as const, reason: "missing_bundle" as const };

    const baselineId =
      Object.values(scenarioBundles).find((b) => b.scenario.baseline)?.scenario.id ??
      activeScenarioId;
    const baselineBundle =
      baselineId !== activeScenarioId ? scenarioBundles[baselineId] : undefined;

    const ctx = buildFeasibilityEvalContext({
      anchorCompany,
      streams,
      opportunities,
      bundle,
      baselineBundle,
      hrSnapshot,
      serviceHoursByTemplateId,
    });

    const result = evaluateOperationalFeasibility(ctx, labels);
    return { phase: "ready" as const, result };
  }, [
    enabled,
    anchorCompany,
    streams,
    opportunities,
    scenarioBundles,
    activeScenarioId,
    baseScenarioId,
    compareScenarioId,
    comparison,
    compareMode,
    hrSnapshot,
    serviceHoursByTemplateId,
    labels,
  ]);
}
