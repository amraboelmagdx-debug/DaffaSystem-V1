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

type CatalogEntityType =
  | "serviceFamily"
  | "serviceTier"
  | "serviceTemplate"
  | "serviceTemplateTier"
  | "deliveryPhase"
  | "serviceTemplateTierPhase"
  | "serviceDeliverable"
  | "serviceRoleAllocation";

export interface ServiceCatalogImportRow {
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
  jobRoleId?: string;
  jobRoleCode?: string;
  allocatedHours?: number;
  allocationNotes?: string;
}

export interface ServiceCatalogImportIssue {
  rowIndex: number;
  field: keyof ServiceCatalogImportRow | "row";
  message: string;
}

export interface ServiceCatalogImportPlan {
  serviceFamilies: ServiceFamily[];
  serviceTiers: ServiceTier[];
  serviceTemplates: ServiceTemplate[];
  serviceTemplateTiers: ServiceTemplateTier[];
  deliveryPhases: DeliveryPhase[];
  serviceTemplateTierPhases: ServiceTemplateTierPhase[];
  serviceDeliverables: ServiceDeliverable[];
  serviceRoleAllocations: ServiceRoleAllocation[];
}

export interface ServiceCatalogImportPreview {
  totalsByEntity: Record<CatalogEntityType, number>;
}

export interface ServiceCatalogImportResult {
  valid: boolean;
  issues: ServiceCatalogImportIssue[];
  preview: ServiceCatalogImportPreview;
  normalizedRows: ServiceCatalogImportRow[];
  plan: ServiceCatalogImportPlan;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeCode(input: string | undefined): string {
  return (input ?? "").trim().toUpperCase();
}

function normalizeName(input: string | undefined): string {
  return (input ?? "").trim();
}

function makeMeta() {
  const t = nowIso();
  return { lifecycle: "draft" as const, version: 1, createdAt: t, updatedAt: t };
}

/**
 * Import foundation function: validates, previews, and normalizes row-shaped input.
 * Dedupe strategy:
 * - primary: stable codes (family/tier/template/phase/deliverable)
 * - fallback: deterministic composite keys where code is absent
 */
export function buildServiceCatalogImportPlan(rows: ServiceCatalogImportRow[]): ServiceCatalogImportResult {
  const issues: ServiceCatalogImportIssue[] = [];
  const normalizedRows = rows.map((row) => ({
    ...row,
    serviceFamilyCode: normalizeCode(row.serviceFamilyCode),
    serviceFamilyName: normalizeName(row.serviceFamilyName),
    serviceTierCode: normalizeCode(row.serviceTierCode),
    serviceTierName: normalizeName(row.serviceTierName),
    serviceTemplateCode: normalizeCode(row.serviceTemplateCode),
    serviceTemplateName: normalizeName(row.serviceTemplateName),
    businessUnitId: (row.businessUnitId ?? "").trim(),
    deliveryPhaseCode: normalizeCode(row.deliveryPhaseCode),
    deliveryPhaseName: normalizeName(row.deliveryPhaseName),
    phaseSortOrder: Number.isFinite(row.phaseSortOrder ?? NaN) ? Number(row.phaseSortOrder) : undefined,
    deliverableCode: normalizeCode(row.deliverableCode),
    deliverableName: normalizeName(row.deliverableName),
  }));

  const familyByKey = new Map<string, ServiceFamily>();
  const tierByKey = new Map<string, ServiceTier>();
  const templateByKey = new Map<string, ServiceTemplate>();
  const templateTierByKey = new Map<string, ServiceTemplateTier>();
  const phaseByKey = new Map<string, DeliveryPhase>();
  const templateTierPhaseByKey = new Map<string, ServiceTemplateTierPhase>();
  const deliverableByKey = new Map<string, ServiceDeliverable>();
  const allocationByKey = new Map<string, ServiceRoleAllocation>();

  normalizedRows.forEach((row, idx) => {
    const rowIndex = idx + 1;
    if (!row.serviceFamilyCode) issues.push({ rowIndex, field: "serviceFamilyCode", message: "Family code is required" });
    if (!row.serviceFamilyName) issues.push({ rowIndex, field: "serviceFamilyName", message: "Family name is required" });
    if (!row.serviceTierCode) issues.push({ rowIndex, field: "serviceTierCode", message: "Tier code is required" });
    if (!row.serviceTierName) issues.push({ rowIndex, field: "serviceTierName", message: "Tier name is required" });
    if (!row.serviceTemplateCode) issues.push({ rowIndex, field: "serviceTemplateCode", message: "Template code is required" });
    if (!row.serviceTemplateName) issues.push({ rowIndex, field: "serviceTemplateName", message: "Template name is required" });
    if (!row.businessUnitId) issues.push({ rowIndex, field: "businessUnitId", message: "Business unit id is required" });
    if (!row.deliveryPhaseCode) issues.push({ rowIndex, field: "deliveryPhaseCode", message: "Delivery phase code is required" });
    if (!row.deliveryPhaseName) issues.push({ rowIndex, field: "deliveryPhaseName", message: "Delivery phase name is required" });
    if (row.phaseSortOrder == null || row.phaseSortOrder < 0) {
      issues.push({ rowIndex, field: "phaseSortOrder", message: "Phase sort order must be a non-negative number" });
    }
    const hasAllocation =
      Boolean(row.jobRoleId?.trim() || row.jobRoleCode?.trim()) ||
      row.allocatedHours != null;
    if (!hasAllocation) {
      if (!row.deliverableCode) issues.push({ rowIndex, field: "deliverableCode", message: "Deliverable code is required" });
      if (!row.deliverableName) issues.push({ rowIndex, field: "deliverableName", message: "Deliverable name is required" });
    }
    if (hasAllocation) {
      if (!row.jobRoleId?.trim() && !row.jobRoleCode?.trim()) {
        issues.push({ rowIndex, field: "jobRoleId", message: "Job role id or code is required for allocation rows" });
      }
      if (row.allocatedHours == null || !Number.isFinite(row.allocatedHours) || row.allocatedHours < 0) {
        issues.push({ rowIndex, field: "allocatedHours", message: "Allocated hours must be >= 0 for allocation rows" });
      }
    }

    const familyKey = row.serviceFamilyCode || `family-name:${row.serviceFamilyName}`;
    if (familyKey && !familyByKey.has(familyKey) && row.serviceFamilyName) {
      familyByKey.set(familyKey, {
        id: newServiceId("svc_family"),
        code: row.serviceFamilyCode || `FAMILY_${familyByKey.size + 1}`,
        name: row.serviceFamilyName,
        ...makeMeta(),
      });
    }
    const family = familyByKey.get(familyKey);
    if (!family) return;

    const tierKey = row.serviceTierCode || `${family.id}::tier-name:${row.serviceTierName}`;
    if (tierKey && !tierByKey.has(tierKey) && row.serviceTierName) {
      tierByKey.set(tierKey, {
        id: newServiceId("svc_tier"),
        serviceFamilyId: family.id,
        code: row.serviceTierCode || `TIER_${tierByKey.size + 1}`,
        name: row.serviceTierName,
        ...makeMeta(),
      });
    }
    const tier = tierByKey.get(tierKey);
    if (tier && tier.serviceFamilyId !== family.id) {
      issues.push({
        rowIndex,
        field: "serviceTierCode",
        message: "Tier resolves to a different family than this row",
      });
    }

    const templateKey = row.serviceTemplateCode || `${family.id}::template-name:${row.serviceTemplateName}`;
    if (templateKey && !templateByKey.has(templateKey) && row.serviceTemplateName && row.businessUnitId) {
      templateByKey.set(templateKey, {
        id: newServiceId("svc_template"),
        serviceFamilyId: family.id,
        businessUnitId: row.businessUnitId,
        code: row.serviceTemplateCode || `TEMPLATE_${templateByKey.size + 1}`,
        name: row.serviceTemplateName,
        ...makeMeta(),
      });
    }
    const template = templateByKey.get(templateKey);
    if (template) {
      if (template.serviceFamilyId !== family.id) {
        issues.push({
          rowIndex,
          field: "serviceTemplateCode",
          message: "Template resolves to a different family than this row",
        });
      }
      if (row.businessUnitId && template.businessUnitId !== row.businessUnitId) {
        issues.push({
          rowIndex,
          field: "businessUnitId",
          message: "Template code is mapped to a different business unit",
        });
      }
    }

    if (!template || !tier) {
      if (hasAllocation) {
        issues.push({ rowIndex, field: "row", message: "Allocation row requires template and tier context" });
      }
      return;
    }
    const templateTierKey = `${template.id}::${tier.id}`;
    if (!templateTierByKey.has(templateTierKey)) {
      templateTierByKey.set(templateTierKey, {
        id: newServiceId("svc_template_tier"),
        serviceTemplateId: template.id,
        serviceTierId: tier.id,
        ...makeMeta(),
      });
    }
    const templateTier = templateTierByKey.get(templateTierKey);
    if (!templateTier) return;

    const phaseKey = row.deliveryPhaseCode || `phase-name:${row.deliveryPhaseName}`;
    if (phaseKey && !phaseByKey.has(phaseKey) && row.deliveryPhaseName) {
      phaseByKey.set(phaseKey, {
        id: newServiceId("svc_phase"),
        code: row.deliveryPhaseCode || `PHASE_${phaseByKey.size + 1}`,
        name: row.deliveryPhaseName,
        ...makeMeta(),
      });
    }
    const phase = phaseByKey.get(phaseKey);
    if (!phase) return;

    const templateTierPhaseKey = `${templateTier.id}::${phase.id}`;
    if (!templateTierPhaseByKey.has(templateTierPhaseKey) && row.phaseSortOrder != null) {
      templateTierPhaseByKey.set(templateTierPhaseKey, {
        id: newServiceId("svc_template_tier_phase"),
        serviceTemplateTierId: templateTier.id,
        deliveryPhaseId: phase.id,
        sortOrder: row.phaseSortOrder,
        ...makeMeta(),
      });
    }
    const templateTierPhase = templateTierPhaseByKey.get(templateTierPhaseKey);
    if (!templateTierPhase) return;

    if (hasAllocation && row.allocatedHours != null) {
      const roleKey = (row.jobRoleId ?? row.jobRoleCode ?? "").trim();
      const allocKey = `${templateTierPhase.id}::${roleKey}`;
      if (roleKey && !allocationByKey.has(allocKey)) {
        allocationByKey.set(allocKey, {
          id: newServiceId("svc_alloc"),
          serviceTemplateTierPhaseId: templateTierPhase.id,
          jobRoleId: row.jobRoleId?.trim() || row.jobRoleCode!.trim(),
          allocatedHours: row.allocatedHours,
          notes: row.allocationNotes?.trim() || "",
          ...makeMeta(),
        });
      }
      return;
    }

    const deliverableKey = row.deliverableCode || `${templateTierPhase.id}::deliverable-name:${row.deliverableName}`;
    if (deliverableKey && !deliverableByKey.has(deliverableKey) && row.deliverableName) {
      deliverableByKey.set(deliverableKey, {
        id: newServiceId("svc_deliverable"),
        serviceTemplateTierPhaseId: templateTierPhase.id,
        code: row.deliverableCode || `DELIVERABLE_${deliverableByKey.size + 1}`,
        name: row.deliverableName,
        ...makeMeta(),
      });
    }
  });

  const plan: ServiceCatalogImportPlan = {
    serviceFamilies: [...familyByKey.values()],
    serviceTiers: [...tierByKey.values()],
    serviceTemplates: [...templateByKey.values()],
    serviceTemplateTiers: [...templateTierByKey.values()],
    deliveryPhases: [...phaseByKey.values()],
    serviceTemplateTierPhases: [...templateTierPhaseByKey.values()],
    serviceDeliverables: [...deliverableByKey.values()],
    serviceRoleAllocations: [...allocationByKey.values()],
  };

  const preview: ServiceCatalogImportPreview = {
    totalsByEntity: {
      serviceFamily: plan.serviceFamilies.length,
      serviceTier: plan.serviceTiers.length,
      serviceTemplate: plan.serviceTemplates.length,
      serviceTemplateTier: plan.serviceTemplateTiers.length,
      deliveryPhase: plan.deliveryPhases.length,
      serviceTemplateTierPhase: plan.serviceTemplateTierPhases.length,
      serviceDeliverable: plan.serviceDeliverables.length,
      serviceRoleAllocation: plan.serviceRoleAllocations.length,
    },
  };

  return {
    valid: issues.length === 0,
    issues,
    preview,
    normalizedRows,
    plan,
  };
}

