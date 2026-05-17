import type { CommercialPricingIntelligenceInput } from "@/lib/commercial-pricing-intelligence/types";
import type { HrWorkforceDerived } from "@/lib/hr-workforce/workspace-projection";
import type { EvaluateServiceEconomicsInput } from "@/lib/service-economics/evaluate";
import type { ServiceCostAssumptions, ServiceCostCatalogSlice, ServiceCostScenarioModifiers } from "@/lib/service-cost-simulation/types";

export type ServiceEconomicsEvaluateBase = {
  catalog: ServiceCostCatalogSlice;
  workforce: HrWorkforceDerived;
  roles: Array<{ id: string; businessUnitId: string; name: string; archived?: boolean }>;
  businessUnitIds: string[];
  companies: Array<{ id: string; hrBusinessUnitId?: string | null }>;
  currency: string;
  assumptions: ServiceCostAssumptions;
  scenario: ServiceCostScenarioModifiers;
};

export function buildServiceEconomicsEvaluateInput(
  base: ServiceEconomicsEvaluateBase,
  serviceTemplateId: string,
  serviceTierId: string,
  commercial?: Omit<CommercialPricingIntelligenceInput, "basis">
): EvaluateServiceEconomicsInput {
  return {
    catalog: base.catalog,
    workforce: base.workforce,
    roles: base.roles,
    businessUnitIds: base.businessUnitIds,
    companies: base.companies,
    currency: base.currency,
    serviceTemplateId,
    serviceTierId,
    assumptions: base.assumptions,
    scenario: base.scenario,
    commercial,
  };
}
