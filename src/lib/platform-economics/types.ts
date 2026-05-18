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

import type {
  DemoCompany,
  DemoOpportunity,
  DemoRevenueStream,
  DemoScenario,
} from "@/types/domain";

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
  streamsUpdated: number;
  scenariosCreated: number;
  companiesRetired: number;
  errors: string[];
};

/** Summary row for HR-linked operational units (subset of {@link DemoCompany}). */
export type OperationalUnitProjection = Pick<
  DemoCompany,
  | "id"
  | "name"
  | "fixedCostsMonthly"
  | "growthTargetPct"
  | "marginTargetPct"
  | "npTargetPct"
  | "revenueMonthly"
  | "contributionMarginPct"
  | "marketSegments"
> & {
  hrBusinessUnitId: string | null;
  hrRetired?: boolean;
};

export type PlanningWorkspaceClientModel = {
  organizationId: string;
  organizationName: string | null;
  /** HR-linked business units (planning projection). Same rows as `companies`. */
  operationalUnits: OperationalUnitProjection[];
  companies: DemoCompany[];
  streams: DemoRevenueStream[];
  scenarios: DemoScenario[];
  opportunities: DemoOpportunity[];
};
