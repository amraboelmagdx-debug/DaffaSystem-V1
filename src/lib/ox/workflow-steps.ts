/** Five-step operational journey — visible on get-started / test-lab only. */
export type WorkflowStepId = "setup" | "structure" | "plan" | "monitor" | "incentives";

export type WorkflowStep = {
  id: WorkflowStepId;
  labelKey: string;
  purposeKey: string;
  href: string;
};

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    id: "setup",
    labelKey: "workflow.setup",
    purposeKey: "workflow.setupPurpose",
    href: "/settings",
  },
  {
    id: "structure",
    labelKey: "workflow.structure",
    purposeKey: "workflow.structurePurpose",
    href: "/hr-workforce",
  },
  {
    id: "plan",
    labelKey: "workflow.planStep",
    purposeKey: "workflow.planStepPurpose",
    href: "/sales-plan",
  },
  {
    id: "monitor",
    labelKey: "workflow.monitorStep",
    purposeKey: "workflow.monitorStepPurpose",
    href: "/",
  },
  {
    id: "incentives",
    labelKey: "workflow.incentives",
    purposeKey: "workflow.incentivesPurpose",
    href: "/sales-incentives",
  },
] as const;

export type WorkflowProgressInput = {
  hasOrganization: boolean;
  hrActiveBuCount: number;
  linkedUnitCount: number;
  hasServiceCatalog: boolean;
  scenarioCount: number;
  hasSalesPlanDraft: boolean;
};

export function resolveWorkflowStepIndex(
  stepId: WorkflowStepId,
  input: WorkflowProgressInput
): "complete" | "current" | "upcoming" {
  const completed = getCompletedStepIds(input);
  if (completed.has(stepId)) return "complete";
  const current = getCurrentStepId(input);
  if (stepId === current) return "current";
  return "upcoming";
}

export function getCompletedStepIds(input: WorkflowProgressInput): Set<WorkflowStepId> {
  const done = new Set<WorkflowStepId>();
  if (input.hasOrganization) done.add("setup");
  if (
    input.hrActiveBuCount > 0 &&
    input.linkedUnitCount > 0 &&
    input.hasServiceCatalog
  ) {
    done.add("structure");
  }
  if (input.hasSalesPlanDraft && input.scenarioCount > 0) done.add("plan");
  if (input.linkedUnitCount > 0 && input.scenarioCount > 0) done.add("monitor");
  return done;
}

export function getCurrentStepId(input: WorkflowProgressInput): WorkflowStepId {
  const completed = getCompletedStepIds(input);
  for (const step of WORKFLOW_STEPS) {
    if (!completed.has(step.id)) return step.id;
  }
  return "incentives";
}
