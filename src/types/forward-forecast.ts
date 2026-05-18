import type { BuForecastContext } from "@/lib/planning/measures/bu-forecast-context";
import type {
  OperationalFeasibilityStatus,
  UtilizationBand,
} from "@/types/operational-feasibility";

export type ForecastHorizonMonths = 12 | 24;

export type ForecastHorizon = {
  months: ForecastHorizonMonths;
  /** First period label (YYYY-MM). */
  startMonth: string;
};

export type ForecastPeriodPoint = {
  period: string;
  monthIndex: number;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  npPct: number;
  contributionMarginPct: number;
  salesGap?: number;
};

export type ConfidenceBandPoint = {
  period: string;
  revenueLow: number;
  revenueBase: number;
  revenueHigh: number;
};

export type OperationalPeriodPoint = {
  period: string;
  monthIndex: number;
  demandHours: number;
  supplyHours: number;
  utilizationPct: number;
  utilizationBand: UtilizationBand;
  hiringFteGap: number;
  feasibilityStatus: OperationalFeasibilityStatus;
};

export type TargetAttainmentSummary = {
  workbookSalesTarget: number;
  finalProjectedRevenue: number;
  attainmentPct: number;
  monthsToTarget: number | null;
};

export type SustainabilityLevel = "stable" | "watch" | "elevated" | "critical";

export type SustainabilityIndicator = {
  id: string;
  level: SustainabilityLevel;
  labelKey: string;
  reasonKey: string;
  firstBreachMonth: string | null;
};

export type ForwardForecastNarrative = {
  headline: string;
  bullets: string[];
  sustainabilityIndicators: SustainabilityIndicator[];
};

export type FinancialTrajectory = {
  points: ForecastPeriodPoint[];
  confidenceBands: ConfidenceBandPoint[];
  marginTrendPct: number;
};

export type OperationalTrajectory = {
  mode: "hr_backed" | "unavailable";
  points: OperationalPeriodPoint[];
  firstSaturationMonth: string | null;
  recommendedHireFtePerMonth: number | null;
};

export type ForwardForecastMeta = {
  companyId: string;
  scenarioId: string;
  scenarioName: string;
  horizon: ForecastHorizon;
  buContext: BuForecastContext | null;
};

export type ForwardForecastResult = {
  meta: ForwardForecastMeta;
  financial: FinancialTrajectory;
  operational: OperationalTrajectory;
  targets: TargetAttainmentSummary;
  narrative: ForwardForecastNarrative;
};
