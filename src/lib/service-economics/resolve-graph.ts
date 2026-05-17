import type { ServiceTemplate } from "@/types/service-architecture";

export type CompanyHrLinkSlice = {
  id: string;
  hrBusinessUnitId?: string | null;
};

export function resolveCompanyIdForBusinessUnit(
  businessUnitId: string,
  companies: CompanyHrLinkSlice[]
): string | undefined {
  const match = companies.find((c) => c.hrBusinessUnitId === businessUnitId);
  return match?.id;
}

export function filterTemplatesForBusinessUnit(
  templates: ServiceTemplate[],
  businessUnitId?: string
): ServiceTemplate[] {
  if (!businessUnitId) return templates;
  return templates.filter((t) => t.businessUnitId === businessUnitId);
}
