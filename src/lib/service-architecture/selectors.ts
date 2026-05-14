import type { JobRole } from "@/types/hr-workforce";
import type {
  DeliveryPhase,
  ServiceRoleAllocation,
  ServiceTemplate,
  ServiceTemplateTier,
  ServiceTemplateTierPhase,
  ServiceTier,
} from "@/types/service-architecture";

export function getTemplateLinkedTiers(input: {
  serviceTemplateId: string;
  templateTiers: ServiceTemplateTier[];
  tiers: ServiceTier[];
}): ServiceTier[] {
  const { serviceTemplateId, templateTiers, tiers } = input;
  const linkedTierIds = new Set(
    templateTiers.filter((it) => it.serviceTemplateId === serviceTemplateId).map((it) => it.serviceTierId)
  );
  return tiers.filter((it) => linkedTierIds.has(it.id));
}

export function getTemplateTierPhasesOrdered(input: {
  serviceTemplateTierId: string;
  templateTierPhases: ServiceTemplateTierPhase[];
  phases: DeliveryPhase[];
}): Array<ServiceTemplateTierPhase & { phaseName: string; phaseCode: string }> {
  const { serviceTemplateTierId, templateTierPhases, phases } = input;
  const phaseById = new Map(phases.map((it) => [it.id, it]));
  return templateTierPhases
    .filter((it) => it.serviceTemplateTierId === serviceTemplateTierId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((it) => {
      const phase = phaseById.get(it.deliveryPhaseId);
      return {
        ...it,
        phaseName: phase?.name ?? "Unknown phase",
        phaseCode: phase?.code ?? "N/A",
      };
    });
}

/** BU-gated roles for role-allocation dropdown on template+tier phases. */
export function getJobRolesForTemplateBusinessUnit(input: {
  templateId: string;
  templates: ServiceTemplate[];
  roles: JobRole[];
}): JobRole[] {
  const template = input.templates.find((it) => it.id === input.templateId);
  if (!template) return [];
  return input.roles.filter((role) => !role.archived && role.businessUnitId === template.businessUnitId);
}

export function getRoleAllocationsByPhase(
  allocations: ServiceRoleAllocation[]
): Record<string, ServiceRoleAllocation[]> {
  return allocations.reduce<Record<string, ServiceRoleAllocation[]>>((acc, row) => {
    const list = acc[row.serviceTemplateTierPhaseId] ?? [];
    list.push(row);
    acc[row.serviceTemplateTierPhaseId] = list;
    return acc;
  }, {});
}

