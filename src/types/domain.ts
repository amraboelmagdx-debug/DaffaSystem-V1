import type { OpportunityTierDefinition } from "@/types/sales-plan";

export type AppRole =
  | "admin"
  | "executive"
  | "finance_manager"
  | "sales_director"
  | "analyst"
  | "viewer";

export type OpportunityStage =
  | "discovery"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface DemoCompany {
  id: string;
  name: string;
  organizationId: string;
  /** Stable HR catalog business unit id when synced from workforce module. */
  hrBusinessUnitId?: string;
  fixedCostsMonthly: number;
  growthTargetPct: number;
  marginTargetPct: number;
  npTargetPct: number;
  revenueMonthly: number;
  contributionMarginPct: number;
  marketSegments: string[];
  /**
   * Optional SAR bands for Tiny / Standard / Big / Mega for this company.
   * When set, the Sales Plan wizard loads these definitions; they are saved with “Apply to workspace”.
   */
  opportunityTiers?: OpportunityTierDefinition[];
}

export interface DemoRevenueStream {
  id: string;
  companyId: string;
  name: string;
  /** HR department id when stream was seeded from workforce sync. */
  hrDepartmentId?: string | null;
  /** Optional link to service catalog template (Option A metadata). */
  serviceTemplateId?: string | null;
  /** Optional link to service catalog family (Option A metadata). */
  serviceFamilyId?: string | null;
  contributionMarginPct: number;
  revenueWeight: number;
  avgDealSize: number;
  growthRatePct: number;
  conversionRatePct: number;
  salesCycleDays: number;
}

export interface DemoScenario {
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
}

export interface DemoOpportunity {
  id: string;
  companyId: string;
  clientName: string;
  name: string;
  stage: OpportunityStage;
  probabilityPct: number;
  dealValue: number;
  revenueStreamId: string;
  marketSegment: string;
  riskScore: number;
}

export interface DemoForecastMonth {
  month: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
}
