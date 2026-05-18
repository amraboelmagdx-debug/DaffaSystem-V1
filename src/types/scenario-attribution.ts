import type {
  CompareScenariosInput,
  DeltaSignificance,
  PostureDeltaField,
  ScenarioComparisonResult,
} from "@/types/scenario-comparison";

export type AssumptionDriverId =
  | "overlay.revenueMonthly"
  | "overlay.npTargetPct"
  | "overlay.fixedCostsMonthly"
  | "overlay.growthTargetPct"
  | "overlay.marginTargetPct"
  | "overlay.contributionMarginPct"
  | "lever.growthAdj"
  | "lever.conversionRateAdj"
  | "lever.revenueMixAdj"
  | "lever.fixedCostAdj"
  | "lever.pipelineWeightAdj"
  | "lever.npTargetPct"
  | "workbook.tierOverrides"
  | "governance.riskPosture"
  | "governance.utilizationPosture";

export type AssumptionDriverCategory =
  | "growth"
  | "pricing"
  | "utilization"
  | "staffing"
  | "margin"
  | "cost"
  | "risk"
  | "service_mix"
  | "fixed_cost"
  | "pipeline"
  | "workbook"
  | "governance";

export type DriverRole = "primary" | "secondary" | "other";
export type DriverEffect = "positive" | "negative" | "mixed";
export type AttributionConfidence = "high" | "medium" | "low";

export type MeasureContribution = {
  absolute: number;
  shareOfTotalDeltaPct: number | null;
};

export type DriverContributions = {
  revenue: MeasureContribution;
  netProfit: MeasureContribution;
  grossProfit: MeasureContribution;
  npPct: MeasureContribution;
  salesGap: MeasureContribution;
  workbookCm: MeasureContribution;
};

export type AssumptionDriverAttribution = {
  id: AssumptionDriverId;
  category: AssumptionDriverCategory;
  role: DriverRole;
  effect: DriverEffect;
  confidence: AttributionConfidence;
  significance: DeltaSignificance;
  contributions: DriverContributions;
  baseValue: number | string;
  compareValue: number | string;
};

export type AssumptionImpactMeasure =
  | "revenue"
  | "netProfit"
  | "grossProfit"
  | "npPct"
  | "salesGap"
  | "workbookCm";

export type AssumptionImpactEdge = {
  driverId: AssumptionDriverId;
  measure: AssumptionImpactMeasure;
  weight: number;
};

export type OperationalTradeoff = {
  id: string;
  summaryKey: string;
  revenueDirection: "up" | "down" | "flat";
  marginDirection: "up" | "down" | "flat";
  driverIds: AssumptionDriverId[];
};

export type StrategicPressureIndicator = {
  id: string;
  level: "elevated" | "moderate" | "stable";
  labelKey: string;
  reasonKey: string;
};

export type AttributionNarrative = {
  headline: string;
  whatChanged: string;
  whyChanged: string;
  bullets: string[];
  tradeoffBullets: string[];
};

export type AttributionResidual = {
  revenue: number;
  netProfit: number;
  grossProfit: number;
};

export type AssumptionAttributionMeta = {
  companyId: string;
  baseScenarioId: string;
  compareScenarioId: string;
  baseName: string;
  compareName: string;
};

export type AssumptionAttributionResult = {
  meta: AssumptionAttributionMeta;
  drivers: AssumptionDriverAttribution[];
  byCategory: Partial<Record<AssumptionDriverCategory, AssumptionDriverAttribution[]>>;
  impactGraph: AssumptionImpactEdge[];
  tradeoffs: OperationalTradeoff[];
  riskIndicators: StrategicPressureIndicator[];
  narrative: AttributionNarrative;
  residual: AttributionResidual;
  serviceMixDisclaimer: boolean;
};

export type AttributeScenarioComparisonInput = {
  comparison: ScenarioComparisonResult;
  context: CompareScenariosInput;
};

export type AttributionNarrativeLabels = {
  revenueHeadline: (drivers: string, pct: string) => string;
  marginHeadline: (drivers: string) => string;
  riskHeadline: (reason: string) => string;
  tradeoff: (gain: string, cost: string) => string;
  whatChanged: (count: number) => string;
  whyChanged: (primary: string) => string;
  residualNote: (revenue: string, np: string) => string;
  postureShift: (field: string, from: string, to: string) => string;
  serviceMix: string;
  driverLabel: Record<AssumptionDriverId, string>;
  categoryLabel: Record<AssumptionDriverCategory, string>;
  pressureLabels: Record<string, string>;
  postureLabels: Record<PostureDeltaField, string>;
  postureLevel: Record<string, string>;
};
