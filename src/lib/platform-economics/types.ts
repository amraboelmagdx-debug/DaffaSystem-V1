/**
 * Platform economics graph — shared references across HR, planning, service catalog, sales plan.
 *
 * Source-of-truth hierarchy (tenant-scoped):
 * 1. HR workforce catalog (structure + compensation + OH inputs) — authoritative for org structure & loaded cost
 * 2. company_hr_unit_links + companies (planning operational units) — derived, stable UUID for executive layer
 * 3. revenue_streams / scenarios — planning overlays; department-backed streams seeded from HR, financials editable
 * 4. Service architecture catalog — references hr_business_unit_id + role ids from (1)
 * 5. Sales plan wizard — references streams / service lines from (3)+(4)
 *
 * Conflict handling:
 * - HR wins: BU name, department names (stream labels), auto-derived fixed_costs when company.metadata.syncSource = hr_catalog
 * - Planning wins: baseline_revenue, growth/margin/np targets, stream weights/CM after first create
 * - Retired HR BUs: link removed; company retained with metadata.hrRetiredAt (not deleted)
 */

export const ECONOMICS_SYNC_SOURCE = "hr_catalog" as const;
export const ECONOMICS_SYNC_VERSION = 1;

export type CompanyHrLink = {
  organizationId: string;
  companyId: string;
  hrBusinessUnitId: string;
  lastSyncedAt: string;
};

export type EconomicsSyncResult = {
  ok: boolean;
  organizationId: string;
  companiesUpserted: number;
  linksUpserted: number;
  streamsCreated: number;
  scenariosCreated: number;
  companiesRetired: number;
  errors: string[];
};

export type PlanningWorkspaceClientModel = {
  organizationId: string;
  organizationName: string | null;
  companies: Array<{
    id: string;
    name: string;
    hrBusinessUnitId: string | null;
    fixedCostsMonthly: number;
    growthTargetPct: number;
    marginTargetPct: number;
    npTargetPct: number;
    revenueMonthly: number;
    contributionMarginPct: number;
    marketSegments: string[];
    hrRetired?: boolean;
  }>;
  streams: Array<{
    id: string;
    companyId: string;
    name: string;
    hrDepartmentId: string | null;
    serviceTemplateId?: string | null;
    serviceFamilyId?: string | null;
    contributionMarginPct: number;
    revenueWeight: number;
    avgDealSize: number;
    growthRatePct: number;
    conversionRatePct: number;
    salesCycleDays: number;
  }>;
  scenarios: Array<{
    id: string;
    companyId: string;
    name: string;
    baseline: boolean;
    npTargetPct: number;
    revenueMixAdj: number;
    conversionRateAdj: number;
    fixedCostAdj: number;
    growthAdj: number;
    pipelineWeightAdj: number;
  }>;
  opportunities: Array<{
    id: string;
    companyId: string;
    name: string;
    stage: string;
    amount: number;
    probability: number;
    expectedCloseMonth: string;
  }>;
};
