export type ServiceLifecycle = "draft" | "active" | "inactive" | "archived";

export interface ServiceEntityMeta {
  lifecycle: ServiceLifecycle;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFamily extends ServiceEntityMeta {
  id: string;
  name: string;
  code: string;
  description?: string;
}

/** Tiers are scoped to a single service family. */
export interface ServiceTier extends ServiceEntityMeta {
  id: string;
  serviceFamilyId: string;
  name: string;
  code: string;
  description?: string;
}

/** Templates are scoped to exactly one business unit and one family. */
/** Opportunity size bands (Tiny/Standard/Big/Mega) for planning — not delivery ServiceTier. */
export type ServiceOpportunityTierKey = "tiny" | "standard" | "big" | "mega";

export type ServiceOpportunityTierBand = {
  tierKey: ServiceOpportunityTierKey;
  active: boolean;
  minValueSar?: number;
  maxValueSar?: number | null;
  minSellingPriceSar?: number;
  avgDealValueSar?: number;
};

export interface ServiceTemplate extends ServiceEntityMeta {
  id: string;
  serviceFamilyId: string;
  businessUnitId: string;
  name: string;
  code: string;
  description?: string;
  opportunityTierBands?: ServiceOpportunityTierBand[];
}

/** Join entity linking allowed tiers for a template. */
export interface ServiceTemplateTier extends ServiceEntityMeta {
  id: string;
  serviceTemplateId: string;
  serviceTierId: string;
}

/** Global reusable catalog of delivery phases. */
export interface DeliveryPhase extends ServiceEntityMeta {
  id: string;
  name: string;
  code: string;
  description?: string;
}

/** Ordered phase list per template+tier selection. */
export interface ServiceTemplateTierPhase extends ServiceEntityMeta {
  id: string;
  serviceTemplateTierId: string;
  deliveryPhaseId: string;
  sortOrder: number;
}

export interface ServiceDeliverable extends ServiceEntityMeta {
  id: string;
  serviceTemplateTierPhaseId: string;
  name: string;
  code: string;
  description?: string;
}

/**
 * Role allocations are stored by stable HR `jobRoleId`.
 * This keeps allocations valid across role-name edits.
 */
export interface ServiceRoleAllocation extends ServiceEntityMeta {
  id: string;
  serviceTemplateTierPhaseId: string;
  jobRoleId: string;
  allocatedHours: number;
  notes?: string;
}

