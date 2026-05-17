import type { ServiceArchitectureCatalogPayload } from "@/server/validation/service-catalog-schema";

export type ServiceCatalogStructureIssue = {
  path: string;
  message: string;
};

export function validateServiceCatalogStructure(
  catalog: ServiceArchitectureCatalogPayload
): ServiceCatalogStructureIssue[] {
  const issues: ServiceCatalogStructureIssue[] = [];
  const familyIds = new Set(catalog.serviceFamilies.map((f) => f.id));
  const tierIds = new Set(catalog.serviceTiers.map((t) => t.id));
  const templateIds = new Set(catalog.serviceTemplates.map((t) => t.id));
  const templateTierIds = new Set(catalog.serviceTemplateTiers.map((t) => t.id));
  const phaseIds = new Set(catalog.deliveryPhases.map((p) => p.id));
  const tierPhaseIds = new Set(catalog.serviceTemplateTierPhases.map((p) => p.id));

  for (let i = 0; i < catalog.serviceTiers.length; i++) {
    const t = catalog.serviceTiers[i];
    if (!familyIds.has(t.serviceFamilyId)) {
      issues.push({
        path: `serviceTiers[${i}].serviceFamilyId`,
        message: `Unknown service family id: ${t.serviceFamilyId}`,
      });
    }
  }

  for (let i = 0; i < catalog.serviceTemplates.length; i++) {
    const t = catalog.serviceTemplates[i];
    if (!familyIds.has(t.serviceFamilyId)) {
      issues.push({
        path: `serviceTemplates[${i}].serviceFamilyId`,
        message: `Unknown service family id: ${t.serviceFamilyId}`,
      });
    }
  }

  for (let i = 0; i < catalog.serviceTemplateTiers.length; i++) {
    const link = catalog.serviceTemplateTiers[i];
    if (!templateIds.has(link.serviceTemplateId)) {
      issues.push({
        path: `serviceTemplateTiers[${i}].serviceTemplateId`,
        message: `Unknown template id: ${link.serviceTemplateId}`,
      });
    }
    if (!tierIds.has(link.serviceTierId)) {
      issues.push({
        path: `serviceTemplateTiers[${i}].serviceTierId`,
        message: `Unknown tier id: ${link.serviceTierId}`,
      });
    }
    const template = catalog.serviceTemplates.find((t) => t.id === link.serviceTemplateId);
    const tier = catalog.serviceTiers.find((t) => t.id === link.serviceTierId);
    if (template && tier && template.serviceFamilyId !== tier.serviceFamilyId) {
      issues.push({
        path: `serviceTemplateTiers[${i}].serviceTierId`,
        message: "Tier family must match template family",
      });
    }
  }

  for (let i = 0; i < catalog.serviceTemplateTierPhases.length; i++) {
    const p = catalog.serviceTemplateTierPhases[i];
    if (!templateTierIds.has(p.serviceTemplateTierId)) {
      issues.push({
        path: `serviceTemplateTierPhases[${i}].serviceTemplateTierId`,
        message: `Unknown template-tier id: ${p.serviceTemplateTierId}`,
      });
    }
    if (!phaseIds.has(p.deliveryPhaseId)) {
      issues.push({
        path: `serviceTemplateTierPhases[${i}].deliveryPhaseId`,
        message: `Unknown delivery phase id: ${p.deliveryPhaseId}`,
      });
    }
  }

  for (let i = 0; i < catalog.serviceDeliverables.length; i++) {
    const d = catalog.serviceDeliverables[i];
    if (!tierPhaseIds.has(d.serviceTemplateTierPhaseId)) {
      issues.push({
        path: `serviceDeliverables[${i}].serviceTemplateTierPhaseId`,
        message: `Unknown template-tier phase id: ${d.serviceTemplateTierPhaseId}`,
      });
    }
  }

  for (let i = 0; i < catalog.serviceRoleAllocations.length; i++) {
    const a = catalog.serviceRoleAllocations[i];
    if (!tierPhaseIds.has(a.serviceTemplateTierPhaseId)) {
      issues.push({
        path: `serviceRoleAllocations[${i}].serviceTemplateTierPhaseId`,
        message: `Unknown template-tier phase id: ${a.serviceTemplateTierPhaseId}`,
      });
    }
  }

  return issues;
}
