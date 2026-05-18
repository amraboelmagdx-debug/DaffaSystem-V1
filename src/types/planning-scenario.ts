import type { OpportunityTierDefinition } from "@/types/sales-plan";
import type { DemoCompany, DemoScenario } from "@/types/domain";
import type { TierLine } from "@/lib/planning/workbook-engine";
import type { ScenarioGovernance } from "@/types/scenario-governance";

/** Financial overlay isolated per scenario (merged onto anchor company at read time). */
export type CompanyPlanningOverlay = Pick<
  DemoCompany,
  | "fixedCostsMonthly"
  | "growthTargetPct"
  | "marginTargetPct"
  | "npTargetPct"
  | "revenueMonthly"
  | "contributionMarginPct"
  | "opportunityTiers"
>;

export type ScenarioPlanningBundle = {
  scenario: DemoScenario;
  companyOverlay: CompanyPlanningOverlay;
  tierLineOverrides: Record<string, TierLine[]>;
  parentScenarioId: string | null;
  version: number;
  updatedAt: string;
  /** Optional notes — persisted in assumptions JSON when saved to server. */
  description?: string;
  governance: ScenarioGovernance;
};

export type ScenarioBundleAssumptionsPayload = {
  npTargetPct: number;
  revenueMixAdj: number;
  conversionRateAdj: number;
  fixedCostAdj: number;
  growthAdj: number;
  pipelineWeightAdj: number;
  companyOverlay: CompanyPlanningOverlay;
  tierLineOverrides: Record<string, TierLine[]>;
  parentScenarioId: string | null;
  version: number;
  clientUpdatedAt: string;
  description?: string;
  governance?: ScenarioGovernance;
};
