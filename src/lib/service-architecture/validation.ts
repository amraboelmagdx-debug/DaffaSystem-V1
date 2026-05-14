import type {
  ServiceDeliverable,
  ServiceFamily,
  ServiceRoleAllocation,
  ServiceTemplate,
  ServiceTemplateTier,
  ServiceTemplateTierPhase,
  ServiceTier,
} from "@/types/service-architecture";

export interface ServiceValidationIssue {
  field: string;
  message: string;
}

export function validateServiceTemplate(template: Partial<ServiceTemplate>): ServiceValidationIssue[] {
  const issues: ServiceValidationIssue[] = [];
  if (!template.name?.trim()) issues.push({ field: "name", message: "Template name is required" });
  if (!template.code?.trim()) issues.push({ field: "code", message: "Template code is required" });
  if (!template.serviceFamilyId) issues.push({ field: "serviceFamilyId", message: "Family is required" });
  if (!template.businessUnitId) issues.push({ field: "businessUnitId", message: "Business unit is required" });
  return issues;
}

export function validateServiceTier(tier: Partial<ServiceTier>): ServiceValidationIssue[] {
  const issues: ServiceValidationIssue[] = [];
  if (!tier.name?.trim()) issues.push({ field: "name", message: "Tier name is required" });
  if (!tier.code?.trim()) issues.push({ field: "code", message: "Tier code is required" });
  if (!tier.serviceFamilyId)
    issues.push({ field: "serviceFamilyId", message: "Tier must belong to a service family" });
  return issues;
}

export function validateTemplateTierFamilyConsistency(input: {
  templateTier: Pick<ServiceTemplateTier, "serviceTemplateId" | "serviceTierId">;
  templates: Array<Pick<ServiceTemplate, "id" | "serviceFamilyId">>;
  tiers: Array<Pick<ServiceTier, "id" | "serviceFamilyId">>;
}): ServiceValidationIssue[] {
  const { templateTier, templates, tiers } = input;
  const issues: ServiceValidationIssue[] = [];
  const template = templates.find((it) => it.id === templateTier.serviceTemplateId);
  const tier = tiers.find((it) => it.id === templateTier.serviceTierId);

  if (!template) issues.push({ field: "serviceTemplateId", message: "Template not found" });
  if (!tier) issues.push({ field: "serviceTierId", message: "Tier not found" });
  if (template && tier && template.serviceFamilyId !== tier.serviceFamilyId) {
    issues.push({
      field: "serviceTierId",
      message: "Tier family must match template family",
    });
  }
  return issues;
}

export function validateTemplateTierPhase(phase: Partial<ServiceTemplateTierPhase>): ServiceValidationIssue[] {
  const issues: ServiceValidationIssue[] = [];
  if (!phase.serviceTemplateTierId)
    issues.push({ field: "serviceTemplateTierId", message: "Template-tier link is required" });
  if (!phase.deliveryPhaseId)
    issues.push({ field: "deliveryPhaseId", message: "Delivery phase is required" });
  if (phase.sortOrder == null || !Number.isFinite(phase.sortOrder) || phase.sortOrder < 0) {
    issues.push({ field: "sortOrder", message: "Sort order must be a non-negative number" });
  }
  return issues;
}

export function validateServiceDeliverable(deliverable: Partial<ServiceDeliverable>): ServiceValidationIssue[] {
  const issues: ServiceValidationIssue[] = [];
  if (!deliverable.serviceTemplateTierPhaseId) {
    issues.push({
      field: "serviceTemplateTierPhaseId",
      message: "Deliverable must belong to a template-tier phase",
    });
  }
  if (!deliverable.name?.trim()) issues.push({ field: "name", message: "Deliverable name is required" });
  if (!deliverable.code?.trim()) issues.push({ field: "code", message: "Deliverable code is required" });
  return issues;
}

export function validateServiceRoleAllocation(
  allocation: Partial<ServiceRoleAllocation>
): ServiceValidationIssue[] {
  const issues: ServiceValidationIssue[] = [];
  if (!allocation.serviceTemplateTierPhaseId) {
    issues.push({
      field: "serviceTemplateTierPhaseId",
      message: "Allocation must belong to a template-tier phase",
    });
  }
  if (!allocation.jobRoleId) issues.push({ field: "jobRoleId", message: "Job role is required" });
  if (
    allocation.allocatedHours == null ||
    !Number.isFinite(allocation.allocatedHours) ||
    allocation.allocatedHours < 0
  ) {
    issues.push({ field: "allocatedHours", message: "Allocated hours must be >= 0" });
  }
  return issues;
}

export function validateTierFamilyConsistency(
  tier: Pick<ServiceTier, "serviceFamilyId">,
  familyIds: string[]
): ServiceValidationIssue[] {
  if (!familyIds.includes(tier.serviceFamilyId)) {
    return [{ field: "serviceFamilyId", message: "Tier references unknown service family" }];
  }
  return [];
}

export function validateFamily(family: Partial<ServiceFamily>): ServiceValidationIssue[] {
  const issues: ServiceValidationIssue[] = [];
  if (!family.name?.trim()) issues.push({ field: "name", message: "Family name is required" });
  if (!family.code?.trim()) issues.push({ field: "code", message: "Family code is required" });
  return issues;
}

