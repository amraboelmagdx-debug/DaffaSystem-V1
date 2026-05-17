import type { HrWorkforceCatalogPayload } from "@/server/validation/hr-catalog-schema";

export type HrCatalogStructureIssue = {
  path: string;
  message: string;
};

export function validateHrCatalogStructure(
  catalog: HrWorkforceCatalogPayload
): HrCatalogStructureIssue[] {
  const issues: HrCatalogStructureIssue[] = [];
  const buIds = new Set(catalog.businessUnits.map((b) => b.id));
  const deptById = new Map(catalog.departments.map((d) => [d.id, d]));

  for (let i = 0; i < catalog.departments.length; i++) {
    const d = catalog.departments[i];
    if (!buIds.has(d.businessUnitId)) {
      issues.push({
        path: `departments[${i}].businessUnitId`,
        message: `Unknown business unit id: ${d.businessUnitId}`,
      });
    }
  }

  for (let i = 0; i < catalog.teams.length; i++) {
    const t = catalog.teams[i];
    if (!deptById.has(t.departmentId)) {
      issues.push({
        path: `teams[${i}].departmentId`,
        message: `Unknown department id: ${t.departmentId}`,
      });
    }
  }

  for (let i = 0; i < catalog.roles.length; i++) {
    const r = catalog.roles[i];
    const dept = deptById.get(r.departmentId);
    if (!dept) {
      issues.push({
        path: `roles[${i}].departmentId`,
        message: `Unknown department id: ${r.departmentId}`,
      });
    } else if (r.businessUnitId !== dept.businessUnitId) {
      issues.push({
        path: `roles[${i}].businessUnitId`,
        message: `Role businessUnitId does not match department's business unit`,
      });
    }
    if (!buIds.has(r.businessUnitId)) {
      issues.push({
        path: `roles[${i}].businessUnitId`,
        message: `Unknown business unit id: ${r.businessUnitId}`,
      });
    }
  }

  for (const buId of Object.keys(catalog.ohManualByBusinessUnitId)) {
    if (!buIds.has(buId)) {
      issues.push({
        path: `ohManualByBusinessUnitId.${buId}`,
        message: `OH manual key is not a known business unit id`,
      });
    }
  }

  return issues;
}
