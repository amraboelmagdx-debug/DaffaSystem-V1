import type { HrWorkforceDerived } from "@/lib/hr-workforce/workspace-projection";
import type { JobRole } from "@/types/hr-workforce";
import type { ServiceArchitectureCatalogState } from "@/stores/use-service-architecture-store";
import type { ServiceCostAssumptions, ServiceCostCatalogSlice, ServiceCostSimulationInput } from "./types";

export function catalogSliceFromStore(
  state: Pick<ServiceArchitectureCatalogState, keyof ServiceCostCatalogSlice>
): ServiceCostCatalogSlice {
  return {
    serviceTemplates: state.serviceTemplates,
    serviceTiers: state.serviceTiers,
    serviceTemplateTiers: state.serviceTemplateTiers,
    deliveryPhases: state.deliveryPhases,
    serviceTemplateTierPhases: state.serviceTemplateTierPhases,
    serviceDeliverables: state.serviceDeliverables,
    serviceRoleAllocations: state.serviceRoleAllocations,
  };
}

/** Wires HR workforce economics into the service cost simulation (OH-loaded hourly from `deriveHrWorkforceModel`). */
export function buildServiceCostSimulationInput(input: {
  catalog: ServiceCostCatalogSlice;
  workforce: HrWorkforceDerived;
  roles: JobRole[];
  serviceTemplateId: string;
  serviceTierId: string;
  assumptions: ServiceCostAssumptions;
  scenario: ServiceCostSimulationInput["scenario"];
}): ServiceCostSimulationInput {
  const breakdownByRoleId = new Map(
    [...input.workforce.breakdownByRoleId.entries()].map(([id, b]) => [
      id,
      { standardHourlyCost: b.standardHourlyCost, ohAdjustedHourlyCost: b.ohAdjustedHourlyCost },
    ])
  );
  return {
    catalog: input.catalog,
    roles: input.roles,
    breakdownByRoleId,
    serviceTemplateId: input.serviceTemplateId,
    serviceTierId: input.serviceTierId,
    assumptions: input.assumptions,
    scenario: input.scenario,
  };
}
