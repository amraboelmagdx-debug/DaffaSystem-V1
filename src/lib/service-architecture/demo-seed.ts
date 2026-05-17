import { newServiceId } from "@/lib/service-architecture/id";
import type {
  DeliveryPhase,
  ServiceDeliverable,
  ServiceFamily,
  ServiceRoleAllocation,
  ServiceTemplate,
  ServiceTemplateTier,
  ServiceTemplateTierPhase,
  ServiceTier,
} from "@/types/service-architecture";

function nowIso(): string {
  return new Date().toISOString();
}

function meta() {
  const t = nowIso();
  return { lifecycle: "draft" as const, version: 1, createdAt: t, updatedAt: t };
}

export interface ServiceArchitectureSeedPayload {
  serviceFamilies: ServiceFamily[];
  serviceTiers: ServiceTier[];
  serviceTemplates: ServiceTemplate[];
  serviceTemplateTiers: ServiceTemplateTier[];
  deliveryPhases: DeliveryPhase[];
  serviceTemplateTierPhases: ServiceTemplateTierPhase[];
  serviceDeliverables: ServiceDeliverable[];
  serviceRoleAllocations: ServiceRoleAllocation[];
}

/**
 * Optional operational sample data (not auto-applied).
 * Requires a business unit and at least one role id for matrix defaults.
 */
export function makeServiceArchitectureDemoSeed(input: {
  businessUnitId: string;
  roleIds: string[];
}): ServiceArchitectureSeedPayload {
  const family: ServiceFamily = {
    id: newServiceId("svc_family"),
    name: "Advisory Programs",
    code: "ADV_PROG",
    description: "Operational blueprints for advisory delivery.",
    ...meta(),
  };

  const tierStandard: ServiceTier = {
    id: newServiceId("svc_tier"),
    serviceFamilyId: family.id,
    name: "Standard",
    code: "STANDARD",
    description: "Baseline scope and controls.",
    ...meta(),
  };
  const tierEnterprise: ServiceTier = {
    id: newServiceId("svc_tier"),
    serviceFamilyId: family.id,
    name: "Enterprise",
    code: "ENTERPRISE",
    description: "Extended governance and multi-unit rollout.",
    ...meta(),
  };

  const template: ServiceTemplate = {
    id: newServiceId("svc_template"),
    serviceFamilyId: family.id,
    businessUnitId: input.businessUnitId,
    name: "Operating Model Blueprint",
    code: "OMB",
    description: "Structured service template for transformation engagements.",
    ...meta(),
  };

  const ttStandard: ServiceTemplateTier = {
    id: newServiceId("svc_template_tier"),
    serviceTemplateId: template.id,
    serviceTierId: tierStandard.id,
    ...meta(),
  };
  const ttEnterprise: ServiceTemplateTier = {
    id: newServiceId("svc_template_tier"),
    serviceTemplateId: template.id,
    serviceTierId: tierEnterprise.id,
    ...meta(),
  };

  const phaseDiscovery: DeliveryPhase = {
    id: newServiceId("svc_phase"),
    name: "Discovery",
    code: "DISCOVERY",
    description: "Current-state baseline and operating constraints.",
    ...meta(),
  };
  const phaseDesign: DeliveryPhase = {
    id: newServiceId("svc_phase"),
    name: "Design",
    code: "DESIGN",
    description: "Target blueprint and delivery model definition.",
    ...meta(),
  };

  const ttpStandardDiscovery: ServiceTemplateTierPhase = {
    id: newServiceId("svc_template_tier_phase"),
    serviceTemplateTierId: ttStandard.id,
    deliveryPhaseId: phaseDiscovery.id,
    sortOrder: 1,
    ...meta(),
  };
  const ttpStandardDesign: ServiceTemplateTierPhase = {
    id: newServiceId("svc_template_tier_phase"),
    serviceTemplateTierId: ttStandard.id,
    deliveryPhaseId: phaseDesign.id,
    sortOrder: 2,
    ...meta(),
  };
  const ttpEnterpriseDiscovery: ServiceTemplateTierPhase = {
    id: newServiceId("svc_template_tier_phase"),
    serviceTemplateTierId: ttEnterprise.id,
    deliveryPhaseId: phaseDiscovery.id,
    sortOrder: 1,
    ...meta(),
  };
  const ttpEnterpriseDesign: ServiceTemplateTierPhase = {
    id: newServiceId("svc_template_tier_phase"),
    serviceTemplateTierId: ttEnterprise.id,
    deliveryPhaseId: phaseDesign.id,
    sortOrder: 2,
    ...meta(),
  };

  const deliverables: ServiceDeliverable[] = [
    {
      id: newServiceId("svc_deliverable"),
      serviceTemplateTierPhaseId: ttpStandardDiscovery.id,
      name: "Stakeholder map",
      code: "D_STAKEHOLDER_MAP",
      ...meta(),
    },
    {
      id: newServiceId("svc_deliverable"),
      serviceTemplateTierPhaseId: ttpStandardDesign.id,
      name: "Service blueprint v1",
      code: "D_BLUEPRINT_V1",
      ...meta(),
    },
    {
      id: newServiceId("svc_deliverable"),
      serviceTemplateTierPhaseId: ttpEnterpriseDiscovery.id,
      name: "Enterprise discovery report",
      code: "D_ENT_DISCOVERY",
      ...meta(),
    },
    {
      id: newServiceId("svc_deliverable"),
      serviceTemplateTierPhaseId: ttpEnterpriseDesign.id,
      name: "Governance playbook",
      code: "D_ENT_GOV_PLAYBOOK",
      ...meta(),
    },
  ];

  const roleAllocations: ServiceRoleAllocation[] = [];
  if (input.roleIds.length > 0) {
    const primary = input.roleIds[0]!;
    const secondary = input.roleIds[1] ?? primary;
    roleAllocations.push(
      {
        id: newServiceId("svc_alloc"),
        serviceTemplateTierPhaseId: ttpStandardDiscovery.id,
        jobRoleId: primary,
        allocatedHours: 24,
        notes: "Discovery interviews and baseline synthesis.",
        ...meta(),
      },
      {
        id: newServiceId("svc_alloc"),
        serviceTemplateTierPhaseId: ttpStandardDesign.id,
        jobRoleId: secondary,
        allocatedHours: 40,
        notes: "Blueprint workshops and design QA.",
        ...meta(),
      },
      {
        id: newServiceId("svc_alloc"),
        serviceTemplateTierPhaseId: ttpEnterpriseDiscovery.id,
        jobRoleId: primary,
        allocatedHours: 32,
        notes: "Multi-BU discovery facilitation.",
        ...meta(),
      },
      {
        id: newServiceId("svc_alloc"),
        serviceTemplateTierPhaseId: ttpEnterpriseDesign.id,
        jobRoleId: secondary,
        allocatedHours: 56,
        notes: "Enterprise rollout design and controls.",
        ...meta(),
      }
    );
    if (input.roleIds.length > 2) {
      roleAllocations.push({
        id: newServiceId("svc_alloc"),
        serviceTemplateTierPhaseId: ttpEnterpriseDesign.id,
        jobRoleId: input.roleIds[2]!,
        allocatedHours: 16,
        notes: "Specialist review hours.",
        ...meta(),
      });
    }
  }

  return {
    serviceFamilies: [family],
    serviceTiers: [tierStandard, tierEnterprise],
    serviceTemplates: [template],
    serviceTemplateTiers: [ttStandard, ttEnterprise],
    deliveryPhases: [phaseDiscovery, phaseDesign],
    serviceTemplateTierPhases: [
      ttpStandardDiscovery,
      ttpStandardDesign,
      ttpEnterpriseDiscovery,
      ttpEnterpriseDesign,
    ],
    serviceDeliverables: deliverables,
    serviceRoleAllocations: roleAllocations,
  };
}

