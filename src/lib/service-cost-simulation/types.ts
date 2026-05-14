import type { ServiceCatalogSelection } from "@/lib/service-architecture/sales-plan-bridge";
import type {
  DeliveryPhase,
  ServiceDeliverable,
  ServiceRoleAllocation,
  ServiceTemplate,
  ServiceTemplateTier,
  ServiceTemplateTierPhase,
  ServiceTier,
} from "@/types/service-architecture";

/**
 * Operational assumptions (optional factors). All default to neutral / documented baseline.
 * These multiply or scale **simulation** effort — not commercial price.
 */
export interface ServiceCostAssumptions {
  /**
   * Applied to base allocated hours after phase/scenario hooks (>= 1).
   * Models rework, inefficiency, or padding before implicit wrap.
   */
  deliveryInefficiencyFactor: number;
  /** Multiplier on hours for phases whose code includes "QA" (case-insensitive). */
  qaSensitivityFactor: number;
  /** Multiplier on hours for phases whose code includes "DES" or "DESIGN". */
  designRevisionIntensityFactor: number;
  /** Multiplier on all simulated hours (coordination / meetings load). */
  coordinationLoadFactor: number;
  /** Multiplier on all simulated hours (implicit PM / oversight). */
  managementLoadFactor: number;
  /** Multiplier on hours for phases whose code includes "DELIVERY" or "DEL". */
  clientReviewLagFactor: number;
  /**
   * After line-item loaded cost is summed, add this fraction of that sum as a transparent
   * lump for undocumented wrap (still operational, not margin).
   */
  implicitWrapLoadedCostFraction: number;
}

export interface ServiceCostScenarioModifiers {
  id: string;
  label: string;
  description: string;
  /** Multiplies effective hours together with phase-type and assumption stacks. */
  hoursMultiplier: number;
  /** Multiplies effective hours (intensity / quality bar). */
  effortMultiplier: number;
  /** Multiplies effective hours (coordination stress). */
  coordinationMultiplier: number;
  /** Multiplies effective hours (management stress). */
  managementMultiplier: number;
}

export interface ServiceCostCatalogSlice {
  serviceTemplates: ServiceTemplate[];
  serviceTiers: ServiceTier[];
  serviceTemplateTiers: ServiceTemplateTier[];
  deliveryPhases: DeliveryPhase[];
  serviceTemplateTierPhases: ServiceTemplateTierPhase[];
  serviceDeliverables: ServiceDeliverable[];
  serviceRoleAllocations: ServiceRoleAllocation[];
}

export interface ServiceCostSimulationLine {
  allocationId: string;
  jobRoleId: string;
  roleName: string;
  baseHours: number;
  phaseHourFactor: number;
  assumptionStackFactor: number;
  scenarioStackFactor: number;
  effectiveHours: number;
  standardHourlyCost: number;
  ohAdjustedHourlyCost: number;
  directCost: number;
  loadedCost: number;
  ohContribution: number;
  factorExplanation: string[];
}

export interface ServiceCostPhaseBlock {
  serviceTemplateTierPhaseId: string;
  deliveryPhaseId: string;
  phaseName: string;
  phaseCode: string;
  sortOrder: number;
  lines: ServiceCostSimulationLine[];
  phaseDirectTotal: number;
  phaseLoadedTotal: number;
  phaseOhContribution: number;
  phaseEffectiveHours: number;
}

export interface ServiceCostRoleRollup {
  jobRoleId: string;
  roleName: string;
  effectiveHours: number;
  directCost: number;
  loadedCost: number;
  ohContribution: number;
}

export interface ServiceCostDeliverableBlock {
  deliverableId: string;
  name: string;
  code: string;
  serviceTemplateTierPhaseId: string;
  /** Equal split of phase totals when multiple deliverables share a phase. */
  shareOfPhase: number;
  effectiveHours: number;
  directCost: number;
  loadedCost: number;
  contributingPhaseName: string;
  contributingPhaseCode: string;
}

export interface ServiceCostTotals {
  totalBaseHours: number;
  totalEffectiveHours: number;
  totalDirectCost: number;
  totalLoadedCost: number;
  totalOhContribution: number;
  implicitWrapLoadedCost: number;
}

export interface ServiceCostSimulationSuccess {
  ok: true;
  templateId: string;
  templateName: string;
  templateCode: string;
  businessUnitId: string;
  tierId: string;
  tierName: string;
  tierCode: string;
  serviceTemplateTierId: string;
  assumptions: ServiceCostAssumptions;
  scenario: ServiceCostScenarioModifiers;
  phases: ServiceCostPhaseBlock[];
  roles: ServiceCostRoleRollup[];
  deliverables: ServiceCostDeliverableBlock[];
  totals: ServiceCostTotals;
  warnings: string[];
}

export interface ServiceCostSimulationFailure {
  ok: false;
  errors: string[];
}

export type ServiceCostSimulationResult = ServiceCostSimulationSuccess | ServiceCostSimulationFailure;

export interface ServiceCostSimulationInput {
  catalog: ServiceCostCatalogSlice;
  /** Full role list for BU checks and display names. */
  roles: Array<{ id: string; businessUnitId: string; name: string; archived?: boolean }>;
  /** Pre-derived workforce economics (OH-loaded hourly from HR engine). */
  breakdownByRoleId: Map<string, { standardHourlyCost: number; ohAdjustedHourlyCost: number }>;
  serviceTemplateId: string;
  serviceTierId: string;
  assumptions: ServiceCostAssumptions;
  scenario: ServiceCostScenarioModifiers;
}

/** Optional Sales Plan handoff: same IDs the catalog uses + last successful simulation totals. */
export interface ServiceCostBaselineSnapshot {
  selection: ServiceCatalogSelection;
  computedAt: string;
  totals: Pick<ServiceCostTotals, "totalLoadedCost" | "totalEffectiveHours" | "totalOhContribution">;
  templateCode: string;
  tierCode: string;
}
