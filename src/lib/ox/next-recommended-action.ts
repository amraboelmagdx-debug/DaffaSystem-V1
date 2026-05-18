import type { WorkflowProgressInput } from "@/lib/ox/workflow-steps";

export type RecommendedAction = {
  labelKey: string;
  descriptionKey: string;
  href: string;
  variant: "primary" | "secondary";
};

export function getNextRecommendedAction(
  input: WorkflowProgressInput
): RecommendedAction {
  if (!input.hasOrganization) {
    return {
      labelKey: "nextAction.confirmOrg",
      descriptionKey: "nextAction.confirmOrgDesc",
      href: "/settings",
      variant: "primary",
    };
  }
  if (input.hrActiveBuCount === 0) {
    return {
      labelKey: "nextAction.importHr",
      descriptionKey: "nextAction.importHrDesc",
      href: "/hr-workforce/import",
      variant: "primary",
    };
  }
  if (input.linkedUnitCount === 0) {
    return {
      labelKey: "nextAction.syncWorkspace",
      descriptionKey: "nextAction.syncWorkspaceDesc",
      href: "/hr-workforce",
      variant: "primary",
    };
  }
  if (!input.hasServiceCatalog) {
    return {
      labelKey: "nextAction.defineServices",
      descriptionKey: "nextAction.defineServicesDesc",
      href: "/service-architecture",
      variant: "primary",
    };
  }
  if (input.scenarioCount === 0) {
    return {
      labelKey: "nextAction.createScenario",
      descriptionKey: "nextAction.createScenarioDesc",
      href: "/sales-plan",
      variant: "primary",
    };
  }
  if (!input.hasSalesPlanDraft) {
    return {
      labelKey: "nextAction.authorPlan",
      descriptionKey: "nextAction.authorPlanDesc",
      href: "/sales-plan",
      variant: "primary",
    };
  }
  return {
    labelKey: "nextAction.reviewExecutive",
    descriptionKey: "nextAction.reviewExecutiveDesc",
    href: "/",
    variant: "primary",
  };
}
