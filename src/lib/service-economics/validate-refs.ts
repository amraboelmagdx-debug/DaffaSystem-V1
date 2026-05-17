import type { ServiceCostCatalogSlice } from "@/lib/service-cost-simulation/types";

export type ServiceEconomicsRefIssue = {
  path: string;
  message: string;
};

export function validateServiceEconomicsRefs(input: {
  catalog: ServiceCostCatalogSlice;
  businessUnitIds: Set<string>;
  jobRoleIds: Set<string>;
  serviceTemplateId: string;
  serviceTierId: string;
}): ServiceEconomicsRefIssue[] {
  const issues: ServiceEconomicsRefIssue[] = [];
  const template = input.catalog.serviceTemplates.find((t) => t.id === input.serviceTemplateId);
  if (!template) {
    issues.push({ path: "serviceTemplateId", message: "Service template not found" });
    return issues;
  }
  if (!input.businessUnitIds.has(template.businessUnitId)) {
    issues.push({
      path: "serviceTemplates.businessUnitId",
      message: `Unknown HR business unit: ${template.businessUnitId}`,
    });
  }
  for (const alloc of input.catalog.serviceRoleAllocations) {
    if (!input.jobRoleIds.has(alloc.jobRoleId)) {
      issues.push({
        path: `serviceRoleAllocations.${alloc.id}.jobRoleId`,
        message: `Unknown HR job role: ${alloc.jobRoleId}`,
      });
    }
  }
  return issues;
}
