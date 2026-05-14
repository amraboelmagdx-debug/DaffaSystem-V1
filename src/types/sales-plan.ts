/**
 * Revenue Planning OS — structured sales plan model (incremental).
 * Extends concepts from the workbook engine without replacing domain.ts.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type OpportunityTierKey = "tiny" | "standard" | "big" | "mega";

export interface OpportunityTierDefinition {
  key: OpportunityTierKey;
  labelKey: string;
  minValueSar: number;
  /** null = no upper cap (mega) */
  maxValueSar: number | null;
  classLabel: "A" | "B" | "C" | "D";
  strategicPurposeKey: string;
  cashFlowImpact: number;
  growthImpact: number;
  stabilityScore: number;
  riskLevel: RiskLevel;
  expectedSalesCycleDays: number;
  operationalComplexity: number;
}

export interface SalesPlanMeta {
  portfolioName: string;
  planningYear: number;
  currency: string;
  planningScenarioName: string;
}

export type FixedCostCategoryKey =
  | "salaries"
  | "office_rent"
  | "operations"
  | "software"
  | "marketing"
  | "legal_accounting"
  | "utilities"
  | "travel"
  | "management_overhead"
  | "custom";

export interface FixedCostLine {
  id: string;
  categoryKey: FixedCostCategoryKey;
  /** When categoryKey === custom */
  customLabel?: string;
  amountMonthly: number;
  amountYearly: number;
  recurring: boolean;
  oneTime: boolean;
}

export type DeliveryType = "product" | "service" | "hybrid";

export interface ProductServiceLine {
  id: string;
  name: string;
  category: string;
  deliveryType: DeliveryType;
  strategicImportance: number;
  operationalComplexity: number;
  scalabilityScore: number;
}

export interface ServiceRevenueShare {
  serviceId: string;
  /** 0–1, sum across services should be 1 */
  sharePct: number;
}

export interface TierMixForService {
  serviceId: string;
  /** tier key → 0–1, sum should be 1 per service */
  mix: Partial<Record<OpportunityTierKey, number>>;
}

export interface ContributionCell {
  serviceId: string;
  tierKey: OpportunityTierKey;
  exists: boolean;
  avgDealValueSar: number;
  contributionMarginPct: number;
  deliveryCostSar: number;
  salesCycleDays: number;
}

export interface ConversionRates {
  contactToLead: number;
  leadToQualifiedOpp: number;
  qualifiedOppToBidding: number;
  biddingToAward: number;
}

export interface QuarterlyWeights {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export const DEFAULT_CONVERSION_RATES: ConversionRates = {
  contactToLead: 0.12,
  leadToQualifiedOpp: 0.25,
  qualifiedOppToBidding: 0.4,
  biddingToAward: 0.18,
};

export const DEFAULT_QUARTERLY_WEIGHTS: QuarterlyWeights = {
  q1: 0.15,
  q2: 0.25,
  q3: 0.3,
  q4: 0.3,
};

export type MarketSegmentKey = "governmental" | "private" | "semi_governmental" | "nonprofit";

export interface MarketSegmentShare {
  segment: MarketSegmentKey;
  targetPct: number;
}
