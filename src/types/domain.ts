import type { OpportunityTierDefinition, OpportunityTierKey } from "@/types/sales-plan";
import type { IncentiveProposalComplexity } from "@/types/incentives";

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

/**
 * Planning projection of an HR Business Unit (Supabase `companies` row).
 * UI label: Business unit. Prefer {@link OperationalUnit} in new code.
 */
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

/** Alias: canonical operational entity in the BU-centric model. */
export type OperationalUnit = DemoCompany;

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

export type OpportunityClientType = "new_client" | "existing_client";

export type OpportunitySalesPhaseAttribution = {
  lead_gen: number;
  technical: number;
  financial: number;
  closing: number;
};

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
  /** Canonical deal-size tier (Sales Plan SAR bands). */
  tierKey?: OpportunityTierKey;
  referral?: boolean;
  clientType?: OpportunityClientType;
  complexity?: Exclude<IncentiveProposalComplexity, "any">;
  /** Optional margin for incentive pool (SAR). */
  marginSar?: number;
  /** Comp phase weights; defaults applied in incentive bridge when omitted. */
  salesPhaseAttribution?: OpportunitySalesPhaseAttribution;
}

export interface DemoForecastMonth {
  month: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
}
