import type { ServiceArchitectureCatalogState } from "@/stores/use-service-architecture-store";
import {
  serviceArchitectureCatalogPayloadSchema,
  type ServiceArchitectureCatalogPayload,
} from "@/server/validation/service-catalog-schema";

export function fingerprintServiceCatalog(catalog: ServiceArchitectureCatalogPayload): string {
  return JSON.stringify(catalog);
}

export function partializeServiceCatalogFromState(
  state: ServiceArchitectureCatalogState
): ServiceArchitectureCatalogPayload {
  return serviceArchitectureCatalogPayloadSchema.parse({
    serviceFamilies: state.serviceFamilies,
    serviceTiers: state.serviceTiers,
    serviceTemplates: state.serviceTemplates,
    serviceTemplateTiers: state.serviceTemplateTiers,
    deliveryPhases: state.deliveryPhases,
    serviceTemplateTierPhases: state.serviceTemplateTierPhases,
    serviceDeliverables: state.serviceDeliverables,
    serviceRoleAllocations: state.serviceRoleAllocations,
  });
}
