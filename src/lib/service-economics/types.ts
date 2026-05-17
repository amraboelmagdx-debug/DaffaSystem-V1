import type { CommercialPricingIntelligenceResult } from "@/lib/commercial-pricing-intelligence/types";
import type { ServiceCostSimulationSuccess } from "@/lib/service-cost-simulation/types";
import {
  SERVICE_ARCHITECTURE_ENGINE_VERSION,
  SERVICE_ECONOMICS_FORMULA_VERSION,
} from "@/lib/service-architecture/workspace-versions";

export const SERVICE_ECONOMICS_ENGINE_VERSION = 1;

export const SERVICE_ECONOMICS_MEASURE_KEYS = {
  directCost: "serviceEconomics.directCost",
  loadedCost: "serviceEconomics.loadedCost",
  ohContribution: "serviceEconomics.ohContribution",
  effectiveHours: "serviceEconomics.effectiveHours",
  minSellPrice: "serviceEconomics.minSellPrice",
  suggestedPrice: "serviceEconomics.suggestedPrice",
  grossMarginPct: "serviceEconomics.grossMarginPct",
  contributionMarginPct: "serviceEconomics.contributionMarginPct",
} as const;

export type ServiceEconomicsGraphContext = {
  organizationId?: string;
  companyId?: string;
  hrBusinessUnitId: string;
  serviceFamilyId?: string;
  templateId: string;
  tierId: string;
  currency: string;
};

export type ServiceEconomicsLineage = {
  serviceCatalogUpdatedAt?: string;
  hrCatalogUpdatedAt?: string;
  engineVersion: number;
  formulaVersion: number;
};

export type ServiceEconomicsMeasures = {
  directCost: number;
  loadedCost: number;
  ohContribution: number;
  effectiveHours: number;
  minSellPrice?: number;
  suggestedPrice?: number;
  grossMarginPct?: number;
  contributionMarginPct?: number;
};

export type ServiceEconomicsAllocationLine = {
  allocationId: string;
  jobRoleId: string;
  roleName: string;
  effectiveHours: number;
  directCost: number;
  loadedCost: number;
  ohContribution: number;
};

export type ServiceEconomicsSnapshot = {
  ok: true;
  graph: ServiceEconomicsGraphContext;
  lineage: ServiceEconomicsLineage;
  measures: ServiceEconomicsMeasures;
  warnings: string[];
  allocationLines: ServiceEconomicsAllocationLine[];
  cost: ServiceCostSimulationSuccess;
  commercial?: CommercialPricingIntelligenceResult & { ok: true };
};

export type ServiceEconomicsFailure = {
  ok: false;
  errors: string[];
  warnings: string[];
};

export type ServiceEconomicsResult = ServiceEconomicsSnapshot | ServiceEconomicsFailure;

export function defaultServiceEconomicsLineage(): ServiceEconomicsLineage {
  return {
    engineVersion: SERVICE_ECONOMICS_ENGINE_VERSION,
    formulaVersion: SERVICE_ECONOMICS_FORMULA_VERSION,
    serviceCatalogUpdatedAt: undefined,
    hrCatalogUpdatedAt: undefined,
  };
}

export function catalogEngineVersionsForLineage(): {
  engineVersion: number;
  formulaVersion: number;
} {
  return {
    engineVersion: SERVICE_ARCHITECTURE_ENGINE_VERSION,
    formulaVersion: SERVICE_ECONOMICS_FORMULA_VERSION,
  };
}
