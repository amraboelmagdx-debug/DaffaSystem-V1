import type { HrWorkforceCatalogPayload } from "@/server/validation/hr-catalog-schema";
import type { ServiceArchitectureCatalogPayload } from "@/server/validation/service-catalog-schema";

export type ServiceCatalogReferenceIssue = {
  path: string;
  message: string;
};

export function validateSaAgainstHrCatalog(
  catalog: ServiceArchitectureCatalogPayload,
  hr: HrWorkforceCatalogPayload | null
): ServiceCatalogReferenceIssue[] {
  if (!hr) {
    return [
      {
        path: "catalog",
        message: "HR workforce catalog is required before saving service catalog",
      },
    ];
  }

  const buIds = new Set(hr.businessUnits.map((b) => b.id));
  const roleIds = new Set(hr.roles.map((r) => r.id));
  const issues: ServiceCatalogReferenceIssue[] = [];

  for (let i = 0; i < catalog.serviceTemplates.length; i++) {
    const t = catalog.serviceTemplates[i];
    if (!buIds.has(t.businessUnitId)) {
      issues.push({
        path: `serviceTemplates[${i}].businessUnitId`,
        message: `Unknown HR business unit id: ${t.businessUnitId}`,
      });
    }
  }

  for (let i = 0; i < catalog.serviceRoleAllocations.length; i++) {
    const a = catalog.serviceRoleAllocations[i];
    if (!roleIds.has(a.jobRoleId)) {
      issues.push({
        path: `serviceRoleAllocations[${i}].jobRoleId`,
        message: `Unknown HR job role id: ${a.jobRoleId}`,
      });
    }
  }

  return issues;
}
