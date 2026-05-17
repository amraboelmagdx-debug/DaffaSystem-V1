import type { ServiceCostCatalogSlice } from "@/lib/service-cost-simulation/types";
import type { DealEconomicsInput } from "./types";

export type StreamBuSlice = {
  id: string;
  companyId: string;
  hrBusinessUnitId?: string | null;
  serviceTemplateId?: string | null;
};

export function validateTemplateBelongsToBusinessUnit(
  catalog: ServiceCostCatalogSlice,
  templateId: string,
  hrBusinessUnitId: string
): string | null {
  const template = catalog.serviceTemplates.find((t) => t.id === templateId);
  if (!template) return `Unknown service template: ${templateId}`;
  if (template.businessUnitId !== hrBusinessUnitId) {
    return `Service template ${templateId} belongs to BU ${template.businessUnitId}, not ${hrBusinessUnitId}.`;
  }
  return null;
}

export function validateStreamBelongsToBusinessUnit(
  stream: StreamBuSlice | null | undefined,
  hrBusinessUnitId: string
): string | null {
  if (!stream) return "Revenue stream not found.";
  if (stream.hrBusinessUnitId && stream.hrBusinessUnitId !== hrBusinessUnitId) {
    return `Revenue stream ${stream.id} belongs to BU ${stream.hrBusinessUnitId}, not ${hrBusinessUnitId}.`;
  }
  return null;
}

/** Stream ↔ service template link (planning PATCH / deal economics). */
export function validateStreamServiceTemplateLink(
  catalog: ServiceCostCatalogSlice,
  serviceTemplateId: string,
  streamHrBusinessUnitId: string | null | undefined
): string | null {
  if (!streamHrBusinessUnitId) {
    return "Revenue stream is not linked to an HR business unit; sync HR to planning first.";
  }
  return validateTemplateBelongsToBusinessUnit(
    catalog,
    serviceTemplateId,
    streamHrBusinessUnitId
  );
}

export function validateDealEconomicsIntegrity(
  input: DealEconomicsInput,
  catalog: ServiceCostCatalogSlice,
  streamsById: Map<string, StreamBuSlice>
): string[] {
  const errors: string[] = [];

  const dealTemplateErr = validateTemplateBelongsToBusinessUnit(
    catalog,
    input.serviceTemplateId,
    input.hrBusinessUnitId
  );
  if (dealTemplateErr) errors.push(dealTemplateErr);

  if (input.serviceFamilyId) {
    const template = catalog.serviceTemplates.find((t) => t.id === input.serviceTemplateId);
    if (template && template.serviceFamilyId !== input.serviceFamilyId) {
      errors.push("serviceFamilyId does not match the deal service template family.");
    }
  }

  if (input.revenueStreamId) {
    const streamErr = validateStreamBelongsToBusinessUnit(
      streamsById.get(input.revenueStreamId),
      input.hrBusinessUnitId
    );
    if (streamErr) errors.push(streamErr);
  }

  for (const line of input.lines) {
    const templateId = line.serviceTemplateId ?? input.serviceTemplateId;
    const tierId = line.serviceTierId ?? input.serviceTierId;
    const tErr = validateTemplateBelongsToBusinessUnit(
      catalog,
      templateId,
      input.hrBusinessUnitId
    );
    if (tErr) errors.push(`Line ${line.id}: ${tErr}`);
    if (!catalog.serviceTiers.some((t) => t.id === tierId)) {
      errors.push(`Line ${line.id}: unknown service tier ${tierId}.`);
    }
    if (line.revenueStreamId) {
      const sErr = validateStreamBelongsToBusinessUnit(
        streamsById.get(line.revenueStreamId),
        input.hrBusinessUnitId
      );
      if (sErr) errors.push(`Line ${line.id}: ${sErr}`);
    }
  }

  return errors;
}
