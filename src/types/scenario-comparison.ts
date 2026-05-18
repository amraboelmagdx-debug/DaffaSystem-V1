import type { EngineOutputs } from "@/lib/calculations/engine";
import type { computeWorkbookPlanningSlice } from "@/lib/planning/measures/workbook-planning-slice";
import type { ScenarioAssumptionsSummary, ScenarioGovernance, ScenarioStatus, ScenarioType } from "@/types/scenario-governance";
import type { DemoScenario } from "@/types/domain";

export type DeltaDirection = "up" | "down" | "flat";
export type DeltaSignificance = "low" | "medium" | "high";

export type NumericDelta = {
  base: number;
  compare: number;
  absolute: number;
  percent: number | null;
  direction: DeltaDirection;
  significance: DeltaSignificance;
};

export type PostureDeltaField =
  | "growthPosture"
  | "utilizationPosture"
  | "hiringPosture"
  | "pricingPosture"
  | "costPosture";

export type PostureDelta = {
  field: PostureDeltaField;
  base: ScenarioAssumptionsSummary[PostureDeltaField];
  compare: ScenarioAssumptionsSummary[PostureDeltaField];
  shifted: boolean;
};

export type StringDelta = {
  base: string;
  compare: string;
  changed: boolean;
};

export type ScenarioBundleEvaluation = {
  scenarioId: string;
  scenario: DemoScenario;
  governance: ScenarioGovernance;
  assumptionsSummary: ScenarioAssumptionsSummary;
  engine: EngineOutputs;
  workbook: ReturnType<typeof computeWorkbookPlanningSlice>;
  blendedStreamCmPct: number;
  tierOverrideStreamCount: number;
};

export type ScenarioComparisonMeta = {
  companyId: string;
  baseScenarioId: string;
  compareScenarioId: string;
  baseName: string;
  compareName: string;
  baseType: ScenarioType;
  compareType: ScenarioType;
  baseStatus: ScenarioStatus;
  compareStatus: ScenarioStatus;
};

export type ScenarioFinancialDeltas = {
  revenue: NumericDelta;
  grossProfit: NumericDelta;
  netProfit: NumericDelta;
  npPct: NumericDelta;
  operatingMarginPct: NumericDelta;
  roi: NumericDelta;
  salesNeededGap: NumericDelta;
  salesTargetRevenue: NumericDelta;
  burnRateMonthly: NumericDelta;
  workbookBlendedCm: NumericDelta;
  workbookSalesTarget: NumericDelta;
  workbookNpAtTarget: NumericDelta;
  workbookRoiOnFixed: NumericDelta;
};

export type ScenarioOperationalDeltas = {
  fixedCostsMonthly: NumericDelta;
  growthTargetPct: NumericDelta;
  revenueMonthly: NumericDelta;
  npTargetPct: NumericDelta;
  marginTargetPct: NumericDelta;
  growthAdj: NumericDelta;
  fixedCostAdj: NumericDelta;
  revenueMixAdj: NumericDelta;
  conversionRateAdj: NumericDelta;
  pipelineWeightAdj: NumericDelta;
  tierOverrideStreamCount: NumericDelta;
};

export type ScenarioGovernanceDeltas = {
  scenarioType: { base: ScenarioType; compare: ScenarioType; changed: boolean };
  status: { base: ScenarioStatus; compare: ScenarioStatus; changed: boolean };
  riskLevel: StringDelta;
  confidenceLevel: StringDelta;
  aggressivenessLevel: StringDelta;
  strategicObjective: StringDelta;
  planningHorizon: StringDelta;
};

export type CapacityPressureProxy = {
  index: number;
  baseLabel: string;
  compareLabel: string;
  delta: NumericDelta;
  isProxy: true;
};

export type ScenarioComparisonNarrative = {
  headline: string;
  bullets: string[];
  riskFlags: string[];
  sharedStreamMixDisclaimer: boolean;
};

export type ScenarioComparisonResult = {
  meta: ScenarioComparisonMeta;
  base: ScenarioBundleEvaluation;
  compare: ScenarioBundleEvaluation;
  financial: ScenarioFinancialDeltas;
  operational: ScenarioOperationalDeltas;
  posture: PostureDelta[];
  governance: ScenarioGovernanceDeltas;
  capacityPressure: CapacityPressureProxy;
  narrative: ScenarioComparisonNarrative;
};

export type CompareScenariosInput = {
  anchorCompany: import("@/types/domain").DemoCompany;
  streams: import("@/types/domain").DemoRevenueStream[];
  opportunities: import("@/types/domain").DemoOpportunity[];
  bundlesById: Record<string, import("@/types/planning-scenario").ScenarioPlanningBundle>;
  baseScenarioId: string;
  compareScenarioId: string;
};

export type ComparisonNarrativeLabels = {
  revenueUp: (pct: string, compareName: string, baseName: string) => string;
  revenueDown: (pct: string, compareName: string, baseName: string) => string;
  netProfitUp: (pct: string) => string;
  netProfitDown: (pct: string) => string;
  postureShift: (field: string, from: string, to: string) => string;
  governanceTypeChange: (from: string, to: string) => string;
  salesGapWiden: (amount: string) => string;
  salesGapNarrow: (amount: string) => string;
  sharedStreams: string;
  capacityProxy: (from: string, to: string) => string;
  defaultHeadline: (compareName: string, baseName: string) => string;
  postureLabels: Record<PostureDeltaField, string>;
  postureLevel: Record<string, string>;
};
