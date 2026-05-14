/**
 * Deterministic in-memory catalog for validation / stress tests.
 * Mirrors real agency-style structures: Branding, Strategy, Motion, Communications.
 * Not loaded into the app store automatically.
 */

import type { JobRole } from "@/types/hr-workforce";
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

const meta = {
  lifecycle: "active" as const,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export interface OperationalStressCatalog {
  /** Synthetic BU ids aligned with families for isolation tests. */
  businessUnitIds: Record<"branding" | "strategy" | "motion" | "communications", string>;
  departmentIds: Record<"branding" | "strategy" | "motion" | "communications", string>;
  roles: JobRole[];
  serviceFamilies: ServiceFamily[];
  serviceTiers: ServiceTier[];
  serviceTemplates: ServiceTemplate[];
  serviceTemplateTiers: ServiceTemplateTier[];
  deliveryPhases: DeliveryPhase[];
  serviceTemplateTierPhases: ServiceTemplateTierPhase[];
  serviceDeliverables: ServiceDeliverable[];
  serviceRoleAllocations: ServiceRoleAllocation[];
}

function role(id: string, businessUnitId: string, departmentId: string, name: string): JobRole {
  return {
    id,
    businessUnitId,
    departmentId,
    teamId: undefined,
    name,
    employmentType: "full_time",
    employeeCount: 2,
    currency: "SAR",
    avgMonthlySalary: 0,
    avgMonthlySocialInsurance: 0,
    annualMedicalInsurance: 0,
    annualEndOfServiceCost: 0,
    riskFactorPct: 0,
    isBillable: true,
    includeInOhAllocation: true,
    operationalRoleType: "delivery",
    additionalCosts: [],
    archived: false,
  };
}

/**
 * Builds ~15 templates, 4 families × 4 tiers (16 tier rows, family-scoped),
 * shared global phases, tier-dependent phase depth, multi-BU roles, allocations.
 */
export function makeOperationalStressCatalog(): OperationalStressCatalog {
  const bu = {
    branding: "bu-stress-branding",
    strategy: "bu-stress-strategy",
    motion: "bu-stress-motion",
    communications: "bu-stress-comms",
  };
  const dept = {
    branding: "dept-stress-branding",
    strategy: "dept-stress-strategy",
    motion: "dept-stress-motion",
    communications: "dept-stress-comms",
  };

  const roles: JobRole[] = [
    role("jr-brand-cd", bu.branding, dept.branding, "Creative Director"),
    role("jr-brand-des", bu.branding, dept.branding, "Brand Designer"),
    role("jr-strat-lead", bu.strategy, dept.strategy, "Strategy Lead"),
    role("jr-strat-ana", bu.strategy, dept.strategy, "Research Analyst"),
    role("jr-motion-ae", bu.motion, dept.motion, "Motion AE"),
    role("jr-motion-mg", bu.motion, dept.motion, "Motion Graphics"),
    role("jr-comms-am", bu.communications, dept.communications, "Account Manager"),
    role("jr-comms-copy", bu.communications, dept.communications, "Copywriter"),
  ];

  const families: ServiceFamily[] = [
    { id: "fam-brand", name: "Branding", code: "BRAND", description: "Identity & systems", ...meta },
    { id: "fam-strat", name: "Strategy", code: "STRAT", description: "Positioning & plans", ...meta },
    { id: "fam-motion", name: "Motion Graphics", code: "MOTION", description: "Video & motion", ...meta },
    { id: "fam-comms", name: "Communications", code: "COMMS", description: "PR & social", ...meta },
  ];

  const tierCodes = ["TINY", "STANDARD", "BIG", "MEGA"] as const;
  const tierNames: Record<(typeof tierCodes)[number], string> = {
    TINY: "Tiny",
    STANDARD: "Standard",
    BIG: "Big",
    MEGA: "Mega",
  };

  const serviceTiers: ServiceTier[] = [];
  for (const f of families) {
    for (const code of tierCodes) {
      serviceTiers.push({
        id: `tier-${f.code}-${code}`,
        serviceFamilyId: f.id,
        name: tierNames[code],
        code,
        description: `${tierNames[code]} within ${f.name}`,
        ...meta,
      });
    }
  }

  const tplSpecs: Array<{
    id: string;
    code: string;
    name: string;
    familyId: string;
    businessUnitId: string;
    linkedTierCodes: (typeof tierCodes)[number][];
  }> = [
    { id: "tpl-bi", code: "BI", name: "Brand Identity", familyId: "fam-brand", businessUnitId: bu.branding, linkedTierCodes: ["TINY", "STANDARD", "BIG", "MEGA"] },
    { id: "tpl-vis", code: "VIS", name: "Visual Identity System", familyId: "fam-brand", businessUnitId: bu.branding, linkedTierCodes: ["STANDARD", "BIG", "MEGA"] },
    { id: "tpl-pkg", code: "PKG", name: "Packaging System", familyId: "fam-brand", businessUnitId: bu.branding, linkedTierCodes: ["BIG", "MEGA"] },
    { id: "tpl-bgf", code: "BGF", name: "Brand Guidelines Refresh", familyId: "fam-brand", businessUnitId: bu.branding, linkedTierCodes: ["TINY", "STANDARD"] },
    { id: "tpl-ps", code: "PS", name: "Positioning Sprint", familyId: "fam-strat", businessUnitId: bu.strategy, linkedTierCodes: ["TINY", "STANDARD", "BIG"] },
    { id: "tpl-cat", code: "CAT", name: "Category & Landscape", familyId: "fam-strat", businessUnitId: bu.strategy, linkedTierCodes: ["STANDARD", "BIG", "MEGA"] },
    { id: "tpl-gtm", code: "GTM", name: "Go-to-Market Plan", familyId: "fam-strat", businessUnitId: bu.strategy, linkedTierCodes: ["STANDARD", "MEGA"] },
    { id: "tpl-qsr", code: "QSR", name: "Quarterly Strategy Retainer", familyId: "fam-strat", businessUnitId: bu.strategy, linkedTierCodes: ["TINY", "STANDARD"] },
    { id: "tpl-exp", code: "EXP", name: "Explainer Video", familyId: "fam-motion", businessUnitId: bu.motion, linkedTierCodes: ["TINY", "STANDARD", "BIG", "MEGA"] },
    { id: "tpl-smp", code: "SMP", name: "Social Motion Pack", familyId: "fam-motion", businessUnitId: bu.motion, linkedTierCodes: ["STANDARD", "BIG"] },
    { id: "tpl-evop", code: "EVOP", name: "Event Opener", familyId: "fam-motion", businessUnitId: bu.motion, linkedTierCodes: ["BIG", "MEGA"] },
    { id: "tpl-pdm", code: "PDM", name: "Product Demo Motion", familyId: "fam-motion", businessUnitId: bu.motion, linkedTierCodes: ["STANDARD", "MEGA"] },
    { id: "tpl-prl", code: "PRL", name: "PR Launch Kit", familyId: "fam-comms", businessUnitId: bu.communications, linkedTierCodes: ["STANDARD", "BIG", "MEGA"] },
    { id: "tpl-soc", code: "SOC", name: "Social Media Retainer", familyId: "fam-comms", businessUnitId: bu.communications, linkedTierCodes: ["TINY", "STANDARD", "BIG"] },
    { id: "tpl-crs", code: "CRS", name: "Crisis Communications Playbook", familyId: "fam-comms", businessUnitId: bu.communications, linkedTierCodes: ["MEGA"] },
  ];

  const serviceTemplates: ServiceTemplate[] = tplSpecs.map((s) => ({
    id: s.id,
    serviceFamilyId: s.familyId,
    businessUnitId: s.businessUnitId,
    name: s.name,
    code: s.code,
    description: "",
    ...meta,
  }));

  const serviceTemplateTiers: ServiceTemplateTier[] = [];
  for (const spec of tplSpecs) {
    const fam = families.find((f) => f.id === spec.familyId)!;
    for (const tc of spec.linkedTierCodes) {
      const tierId = `tier-${fam.code}-${tc}`;
      serviceTemplateTiers.push({
        id: `tt-${spec.id}-${tc}`,
        serviceTemplateId: spec.id,
        serviceTierId: tierId,
        ...meta,
      });
    }
  }

  const deliveryPhases: DeliveryPhase[] = [
    { id: "ph-disc", name: "Discovery", code: "DISCOVERY", ...meta },
    { id: "ph-res", name: "Research", code: "RESEARCH", ...meta },
    { id: "ph-strat", name: "Strategy", code: "STRATEGY", ...meta },
    { id: "ph-des", name: "Design", code: "DESIGN", ...meta },
    { id: "ph-anim", name: "Animation", code: "ANIMATION", ...meta },
    { id: "ph-qa", name: "QA", code: "QA", ...meta },
    { id: "ph-del", name: "Delivery", code: "DELIVERY", ...meta },
  ];

  const phaseSequenceByTierDepth: Record<(typeof tierCodes)[number], string[]> = {
    TINY: ["ph-disc", "ph-des", "ph-del"],
    STANDARD: ["ph-disc", "ph-res", "ph-strat", "ph-des", "ph-qa", "ph-del"],
    BIG: ["ph-disc", "ph-res", "ph-strat", "ph-des", "ph-anim", "ph-qa", "ph-del"],
    MEGA: ["ph-disc", "ph-res", "ph-strat", "ph-des", "ph-anim", "ph-qa", "ph-del"],
  };

  const serviceTemplateTierPhases: ServiceTemplateTierPhase[] = [];
  for (const tt of serviceTemplateTiers) {
    const tier = serviceTiers.find((t) => t.id === tt.serviceTierId)!;
    const tierCode = tier.code as (typeof tierCodes)[number];
    const seq = phaseSequenceByTierDepth[tierCode] ?? phaseSequenceByTierDepth.STANDARD;
    seq.forEach((deliveryPhaseId, i) => {
      serviceTemplateTierPhases.push({
        id: `ttp-${tt.id}-${deliveryPhaseId}`,
        serviceTemplateTierId: tt.id,
        deliveryPhaseId,
        sortOrder: i + 1,
        ...meta,
      });
    });
  }

  const serviceDeliverables: ServiceDeliverable[] = [];
  for (const ttp of serviceTemplateTierPhases) {
    if (ttp.deliveryPhaseId === "ph-des") {
      serviceDeliverables.push({
        id: `del-${ttp.id}-main`,
        serviceTemplateTierPhaseId: ttp.id,
        name: "Primary design artifact",
        code: `DEL_${ttp.id.slice(-6)}`,
        ...meta,
      });
    }
    if (ttp.deliveryPhaseId === "ph-anim") {
      serviceDeliverables.push({
        id: `del-${ttp.id}-story`,
        serviceTemplateTierPhaseId: ttp.id,
        name: "Storyboard",
        code: `SB_${ttp.id.slice(-6)}`,
        ...meta,
      });
    }
  }

  const serviceRoleAllocations: ServiceRoleAllocation[] = [];
  const hourScale: Record<(typeof tierCodes)[number], number> = {
    TINY: 1,
    STANDARD: 1.6,
    BIG: 2.4,
    MEGA: 3.5,
  };

  for (const ttp of serviceTemplateTierPhases) {
    const tt = serviceTemplateTiers.find((x) => x.id === ttp.serviceTemplateTierId)!;
    const template = serviceTemplates.find((x) => x.id === tt.serviceTemplateId)!;
    const tier = serviceTiers.find((x) => x.id === tt.serviceTierId)!;
    const scale = hourScale[tier.code as (typeof tierCodes)[number]] ?? 1;
    const base = 8 * scale;

    const pickRoles = (): [string, string] => {
      if (template.businessUnitId === bu.branding) return ["jr-brand-cd", "jr-brand-des"];
      if (template.businessUnitId === bu.strategy) return ["jr-strat-lead", "jr-strat-ana"];
      if (template.businessUnitId === bu.motion) return ["jr-motion-ae", "jr-motion-mg"];
      return ["jr-comms-am", "jr-comms-copy"];
    };
    const [r1, r2] = pickRoles();

    if (ttp.deliveryPhaseId === "ph-disc" || ttp.deliveryPhaseId === "ph-strat") {
      serviceRoleAllocations.push({
        id: `alloc-${ttp.id}-a`,
        serviceTemplateTierPhaseId: ttp.id,
        jobRoleId: r1,
        allocatedHours: Math.round(base),
        notes: `${tier.name} scope`,
        ...meta,
      });
    }
    if (ttp.deliveryPhaseId === "ph-des" || ttp.deliveryPhaseId === "ph-anim") {
      serviceRoleAllocations.push({
        id: `alloc-${ttp.id}-b`,
        serviceTemplateTierPhaseId: ttp.id,
        jobRoleId: r2,
        allocatedHours: Math.round(base * 1.25),
        ...meta,
      });
    }
  }

  return {
    businessUnitIds: bu,
    departmentIds: dept,
    roles,
    serviceFamilies: families,
    serviceTiers,
    serviceTemplates,
    serviceTemplateTiers,
    deliveryPhases,
    serviceTemplateTierPhases,
    serviceDeliverables,
    serviceRoleAllocations,
  };
}
