export type ScenarioType =
  | "baseline"
  | "break_even"
  | "conservative"
  | "aggressive"
  | "expansion"
  | "stress_case"
  | "recovery_plan"
  | "hiring_freeze"
  | "market_downturn"
  | "strategic_push"
  | "custom";

export type ScenarioStatus = "draft" | "active" | "archived" | "locked" | "approved";

export type PostureLevel = "low" | "neutral" | "high";

export type ScenarioAssumptionsSummary = {
  targetNpPct: number;
  growthPosture: PostureLevel;
  utilizationPosture: PostureLevel;
  hiringPosture: PostureLevel;
  pricingPosture: PostureLevel;
  costPosture: PostureLevel;
};

export type ScenarioGovernance = {
  scenarioType: ScenarioType;
  status: ScenarioStatus;
  description: string;
  notes: string;
  tags: string[];
  owner: string | null;
  createdBy: string | null;
  createdAt: string;
  isReference: boolean;
  clonedFromScenarioId: string | null;
  strategicObjective: string;
  planningHorizon: string;
  confidenceLevel: PostureLevel;
  aggressivenessLevel: PostureLevel;
  riskLevel: PostureLevel;
  assumptionsSummary: ScenarioAssumptionsSummary;
  forecastLineageId: string | null;
  proposalLineageId: string | null;
  aiContextVersion: string | null;
  auditRevision: number;
};
