"use client";

import { useMemo } from "react";
import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { useSalesPlanWizardStore } from "@/stores/use-sales-plan-wizard-store";
import {
  getCurrentStepId,
  getCompletedStepIds,
  type WorkflowProgressInput,
  type WorkflowStepId,
} from "@/lib/ox/workflow-steps";

export function useWorkflowProgressInput(): WorkflowProgressInput {
  const { organizationId } = useTenantPersistenceContext();
  const { linkedUnits, hrActiveBuCount } = useOperationalWorkspace();
  const serviceFamilies = useServiceArchitectureStore((s) => s.serviceFamilies);
  const scenarios = useWorkspaceStore((s) => s.scenarios);
  const selectedCompanyId = useWorkspaceStore((s) => s.selectedCompanyId);
  const meta = useSalesPlanWizardStore((s) => s.meta);

  return useMemo(
    () => ({
      hasOrganization: Boolean(organizationId),
      hrActiveBuCount,
      linkedUnitCount: linkedUnits.length,
      hasServiceCatalog: serviceFamilies.length > 0,
      scenarioCount: scenarios.filter((sc) => sc.companyId === selectedCompanyId).length,
      hasSalesPlanDraft:
        Boolean(meta?.portfolioName?.trim()) || Boolean(meta?.planningScenarioName?.trim()),
    }),
    [
      organizationId,
      hrActiveBuCount,
      linkedUnits.length,
      serviceFamilies.length,
      scenarios,
      selectedCompanyId,
      meta?.portfolioName,
      meta?.planningScenarioName,
    ]
  );
}

export function useWorkflowProgress() {
  const input = useWorkflowProgressInput();
  const currentStepId = getCurrentStepId(input);
  const completed = getCompletedStepIds(input);

  const stepStatus = (id: WorkflowStepId) => {
    if (completed.has(id)) return "complete" as const;
    if (id === currentStepId) return "current" as const;
    return "upcoming" as const;
  };

  return { input, currentStepId, completed, stepStatus };
}
