/**
 * Excel-ready row shapes for future service catalog import (Phase 2+).
 * Role keys resolve against HR catalog `roles` by code or external id.
 */
export type ServiceCatalogImportAllocationRow = {
  serviceTemplateCode?: string;
  serviceTierCode?: string;
  deliveryPhaseCode?: string;
  jobRoleCode?: string;
  jobRoleId?: string;
  allocatedHours?: number;
  notes?: string;
};

export type ServiceCatalogImportFamilyRow = {
  serviceFamilyCode?: string;
  serviceFamilyName?: string;
  serviceTierCode?: string;
  serviceTierName?: string;
  serviceTemplateCode?: string;
  serviceTemplateName?: string;
  businessUnitId?: string;
  deliveryPhaseCode?: string;
  deliveryPhaseName?: string;
  phaseSortOrder?: number;
  deliverableCode?: string;
  deliverableName?: string;
};

export type ServiceCatalogImportWorkbookRows = {
  catalog: ServiceCatalogImportFamilyRow[];
  allocations?: ServiceCatalogImportAllocationRow[];
};
