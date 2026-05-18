/**
 * Sales Team Incentive Economics — canonical domain types (RFC).
 * Payroll compensation remains in hr-workforce; this is accrual/payout only.
 */

import type { OpportunityTierDefinition, OpportunityTierKey } from "@/types/sales-plan";

export const INCENTIVE_CONTRACT_VERSION = 1;
export const INCENTIVE_ENGINE_VERSION = 2;

export type IncentivePlanStatus =
  | "draft"
  | "active"
  | "approved"
  | "archived"
  | "retired";

export type IncentiveRunLifecycle =
  | "draft_run"
  | "pending_approval"
  | "approved"
  | "superseded"
  | "reconciled";

export type RerunPolicy = "block_if_frozen" | "supersede" | "delta_only";

export type ReconciliationRunMeta = {
  supersedesRunId?: string | null;
  factBatchId?: string | null;
  deltaOnly?: boolean;
};

export type IncentiveWarningThresholds = {
  maxNpExposureRatio?: number;
  maxMegaTierShare?: number;
  maxReferralShare?: number;
  minPayoutLagMonths?: number;
  maxPayoutToMarginRatio?: number;
  maxCollectionsLagMonths?: number;
};

export type IncentiveOperationalWarning = {
  code: string;
  severity: "info" | "warn" | "critical";
  message: string;
  explainInputs: Record<string, number | string>;
};

export type IncentiveSimulatorPreset = {
  id?: string;
  name: string;
  count: number;
  referralPct: number;
  newClientPct: number;
  tierMix: Partial<Record<OpportunityTierKey, number>>;
};

export type IncentiveOverrideAuditEntry = {
  id: string;
  planId: string;
  layerId: string;
  jobRoleId: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
};

export type IncentiveReferralClass = "referral" | "non_referral" | "any";

export type IncentiveClientType = "new_client" | "existing_client" | "any";

export type IncentiveProposalComplexity =
  | "normal"
  | "known_budget"
  | "internal_team"
  | "internal_plus_vendors"
  | "any";

export type IncentivePayoutBasis =
  | "order"
  | "cash"
  | "delivery"
  | "collections"
  | "any";

export type IncentiveRateType =
  | "percent_of_deal_value"
  | "percent_of_margin"
  | "percent_of_collections"
  | "flat_sar";

export type IncentiveStackingPolicy = "additive" | "max_of" | "multiplicative_cap";

export type SalesPhaseKey = "lead_gen" | "technical" | "financial" | "closing";

export type IncentiveLayerKey =
  | "lead_gen"
  | "technical"
  | "financial"
  | "closer"
  | "sales_manager"
  | "bd_indirect"
  | "referrer"
  | string;

export type LayerAllocationPolicy =
  | "equal"
  | "by_headcount"
  | "by_salary_weight"
  | "manual_weights";

export type IncentiveRunMode = "simulation" | "shadow_actual" | "approved_payout";

export type ScorecardComponentKey =
  | "financial"
  | "new_clients"
  | "specific_service"
  | "client_segment"
  | "opportunity_type";

export type ScorecardActualSource = "sales_plan" | "planning_scenario" | "crm" | "manual";

export type SalesPhaseWeights = Record<SalesPhaseKey, number>;

export type IncentivePayoutDriverType =
  | "order_signed"
  | "downpayment_cash"
  | "delivery_complete"
  | "collection_received";

export type IncentivePayoutDriver = {
  type: IncentivePayoutDriverType;
  /** Share of layer amount recognized on this driver (0–1). */
  recognitionPct: number;
  /** Months after accrual month when cash is paid. */
  payoutLagMonths: number;
};

export type IncentiveLayer = {
  id: string;
  key: IncentiveLayerKey;
  label: string;
  sortOrder: number;
  /** Percent of deal pool (all layers + reserve should sum ≤ 100). */
  defaultSplitPct: number;
  allocationPolicy: LayerAllocationPolicy;
};

export type IncentiveRoleOverride = {
  layerId: string;
  jobRoleId: string;
  /** When set, replaces layer default split for this role's share of the layer pool. */
  splitPctOfLayer?: number;
  auditReason?: string;
  approvedBy?: string | null;
};

export type IncentiveStackingRule = {
  referralMultiplier?: number;
  newClientMultiplier?: number;
  knownBudgetMultiplier?: number;
  internalPlusVendorsMultiplier?: number;
  megaTierMultiplier?: number;
};

export type IncentivePlanGovernance = {
  status: IncentivePlanStatus;
  revision: number;
  owner?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  parentPlanVersionId?: string | null;
  auditRevision: number;
};

export type IncentiveParticipantAssignment = {
  jobRoleId: string;
  layerId: string;
  weight: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
};

export type ScorecardTargetGrain = "annual" | "quarterly" | "monthly";

export type OverAchievementPolicy = "none" | "linear" | "step";

export type IncentiveScorecardAccelerator = {
  thresholdPct: number;
  rateAbove: number;
  capMultiplier: number;
};

export type IncentivePayoutLifecycleState =
  | "accrued"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "paid"
  | "frozen"
  | "reversed";

export type EvaluateIncentiveRunOptions = {
  /** v1 parity when all false */
  applyReserve?: boolean;
  applyPhaseWeights?: boolean;
  usePayoutDrivers?: boolean;
  useParticipantWeights?: boolean;
  useRoleOverrides?: boolean;
  usePlanStackingRules?: boolean;
  useLayerMatrix?: boolean;
  useReferralRateByTier?: boolean;
  useReferrerShare?: boolean;
  applyManagerTeamRule?: boolean;
};

export const DEFAULT_EVALUATE_INCENTIVE_RUN_OPTIONS: EvaluateIncentiveRunOptions = {
  applyReserve: false,
  applyPhaseWeights: false,
  usePayoutDrivers: false,
  useParticipantWeights: false,
  useRoleOverrides: false,
  usePlanStackingRules: false,
};

export const V2_EVALUATE_INCENTIVE_RUN_OPTIONS: EvaluateIncentiveRunOptions = {
  applyReserve: true,
  applyPhaseWeights: true,
  usePayoutDrivers: true,
  useParticipantWeights: true,
  useRoleOverrides: true,
  usePlanStackingRules: true,
  useLayerMatrix: true,
  useReferrerShare: true,
  useReferralRateByTier: false,
  applyManagerTeamRule: true,
};

export type IncentiveRule = {
  id: string;
  tierKey: OpportunityTierKey;
  referral: IncentiveReferralClass;
  clientType: IncentiveClientType;
  complexity: IncentiveProposalComplexity;
  payoutBasis: IncentivePayoutBasis;
  rateType: IncentiveRateType;
  rateValue: number;
  phaseWeights: SalesPhaseWeights;
  maxPayoutPctOfMargin?: number;
  maxPayoutPctOfDeal?: number;
};

export type IncentiveScorecardComponent = {
  id: string;
  componentKey: ScorecardComponentKey;
  weight: number;
  targetValue: number;
  actualSource: ScorecardActualSource;
  /** Attainment 0–1 from bridge; optional at plan save time. */
  actualValue?: number;
  targetGrain?: ScorecardTargetGrain;
  accelerator?: IncentiveScorecardAccelerator;
  dependsOnComponentId?: string | null;
  teamScope?: "bu" | "department" | "layer";
  overAchievementPolicy?: OverAchievementPolicy;
};

export type IncentiveTargetScorecard = {
  periodYear: number;
  components: IncentiveScorecardComponent[];
};

export type HrSeniority = "senior" | "junior" | "mid";

export type HrHierarchyEntry = {
  jobRoleId: string;
  reportsTo?: string | null;
  mgmtTier: number;
  seniority?: HrSeniority;
  layerId?: string;
};

export type IncentiveLayerMatrixEntry = {
  layerId: string;
  tierKey: OpportunityTierKey;
  recognitionDriver: IncentivePayoutDriverType;
  /** Share of deal pool for this layer/tier/driver (0–100). */
  splitPctOfDealPool: number;
};

export type CommissionRateStage = "order" | "cash";
export type CommissionRateClientType = "new_client" | "existing_client";

export type CommissionRateGridEntry = {
  id: string;
  tierKey: OpportunityTierKey;
  /** Layer key e.g. closer, sales_manager */
  layerKey: string;
  stage: CommissionRateStage;
  clientType: CommissionRateClientType;
  /** When true, referral deals use half of fixedAmountSar or half of pctRate. */
  referralDeal: boolean;
  /** Percent of deal value (0–100), e.g. 0.4 for 0.40%. */
  pctRate?: number;
  /** Fixed SAR amount per deal. */
  fixedAmountSar?: number;
};

export type ManagerTeamRule = {
  teamAchievedMinPct: number;
  teamOverPct: number;
  managerFullMultiplier: number;
  managerUnderTeamMultiplier: number;
  managerOverTeamBonusPct: number;
};

export type BdPhasePolicy = {
  defaultPhaseWeights: SalesPhaseWeights;
  leadTypeMultipliers?: {
    normal?: number;
    known_budget?: number;
  };
  proposalTypeMultipliers?: {
    internal_team?: number;
    internal_plus_vendors?: number;
  };
};

export type IncentivePlan = {
  id: string;
  organizationId: string;
  hrBusinessUnitId: string;
  companyId?: string;
  version: number;
  status: IncentivePlanStatus;
  name: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  stackingPolicy: IncentiveStackingPolicy;
  reservePct: number;
  layers: IncentiveLayer[];
  rules: IncentiveRule[];
  roleOverrides: IncentiveRoleOverride[];
  scorecard: IncentiveTargetScorecard;
  payoutDrivers: IncentivePayoutDriver[];
  revision: number;
  approvedAt?: string | null;
  approvedBy?: string | null;
  governance?: IncentivePlanGovernance;
  stackingRules?: IncentiveStackingRule;
  participantAssignments?: IncentiveParticipantAssignment[];
  warningThresholds?: IncentiveWarningThresholds;
  /** @deprecated Use referrerShareOfCommission — extra pool % by tier. */
  referralRateByTier?: Partial<Record<OpportunityTierKey, number>>;
  /** Share of eligible deal commission paid to referrer layer (0–1). Default 0.5. */
  referrerShareOfCommission?: number;
  layerMatrix?: IncentiveLayerMatrixEntry[];
  /** Optional Excel-style rate grid (tier × role × stage × client × referral). */
  commissionRateGrid?: CommissionRateGridEntry[];
  managerTeamRule?: ManagerTeamRule;
  hrHierarchy?: HrHierarchyEntry[];
  tierProfiles?: OpportunityTierProfile[];
  bdPhasePolicy?: BdPhasePolicy;
  /** Forced tier band overrides per service (audit via override API). */
  tierForceOverrides?: Array<{
    serviceId: string;
    tiers: OpportunityTierDefinition[];
    reason?: string;
  }>;
};

export type IncentiveParticipant = {
  jobRoleId: string;
  layerId: string;
  displayName: string;
  employeeCount: number;
};

export type IncentiveDealTierResolution = {
  scope: OpportunityTierProfileScope | "company_default";
  serviceId?: string | null;
  fromExplicitTierKey?: boolean;
  summary?: string;
};

/** Deal input for simulation or CRM-backed runs. */
export type IncentiveDealInput = {
  id: string;
  label: string;
  tierKey: OpportunityTierKey;
  dealValueSar: number;
  marginSar?: number;
  referral: boolean;
  clientType: "new_client" | "existing_client";
  complexity: Exclude<IncentiveProposalComplexity, "any">;
  accrualMonth: string;
  revenueStreamId?: string | null;
  salesPhaseAttribution?: SalesPhaseWeights;
  tierResolution?: IncentiveDealTierResolution;
};

export type IncentiveSimulationContext = {
  planningScenarioId?: string | null;
  planningScenarioName?: string | null;
};

export type IncentiveRunInput = {
  plan: IncentivePlan;
  deals: IncentiveDealInput[];
  participants: IncentiveParticipant[];
  periodYear: number;
  periodMonth?: number;
  mode: IncentiveRunMode;
  simulation?: IncentiveSimulationContext;
  /** Scorecard attainment multiplier applied to pools (0.5–1.5 typical). */
  scorecardMultiplier?: number;
  /** Team financial attainment 0–1+ for managerTeamRule. */
  managerTeamAttainment?: number;
  options?: EvaluateIncentiveRunOptions;
};

export type IncentiveExplainLine = {
  id: string;
  parentId?: string | null;
  formulaId: string;
  label: string;
  amountSar: number;
  inputs?: Record<string, number | string | boolean>;
  ruleId?: string;
  layerId?: string;
  participantId?: string;
  dealId?: string;
};

export type IncentiveSnapshotLine = {
  dealId: string;
  layerId: string;
  participantId?: string | null;
  jobRoleId?: string | null;
  accrualMonth: string;
  payoutMonth: string;
  amountSar: number;
  phaseKey?: SalesPhaseKey;
  lifecycleState?: IncentivePayoutLifecycleState;
  paidAmountSar?: number;
};

export type IncentivePeriodRollup = {
  periodKey: string;
  accrualTotalSar: number;
  payoutTotalSar: number;
};

export type IncentiveSnapshot = {
  contractVersion: typeof INCENTIVE_CONTRACT_VERSION;
  engineVersion: 1 | typeof INCENTIVE_ENGINE_VERSION;
  planId: string;
  planVersion: number;
  mode: IncentiveRunMode;
  periodYear: number;
  lines: IncentiveSnapshotLine[];
  explainLines: IncentiveExplainLine[];
  byLayer: Record<string, number>;
  byParticipant: Record<string, number>;
  byDeal: Record<string, number>;
  companyTotalSar: number;
  companyRetainedSar: number;
  quarterly: IncentivePeriodRollup[];
  semiannual: IncentivePeriodRollup[];
  annual: IncentivePeriodRollup;
  warnings: string[];
  optionsUsed?: EvaluateIncentiveRunOptions;
};

export type IncentiveRunRecord = {
  id: string;
  planId: string;
  planVersion: number;
  mode: IncentiveRunMode;
  periodYear: number;
  inputHash: string;
  /** Line-level payout state (legacy field on record). */
  lifecycle?: IncentivePayoutLifecycleState;
  runLifecycle?: IncentiveRunLifecycle;
  dedupeKey?: string;
  frozenAt?: string | null;
  supersedesRunId?: string | null;
  reconciliationMeta?: ReconciliationRunMeta | null;
  createdAt: string;
  snapshot: IncentiveSnapshot;
};

export type PayoutFreeze = {
  hrBusinessUnitId: string;
  periodKey: string;
  reason: string;
  frozenAt: string;
};

export type OpportunityTierProfileScope = "global_default" | "bu" | "service";

export type OpportunityTierProfile = {
  scope: OpportunityTierProfileScope;
  hrBusinessUnitId?: string;
  serviceId?: string;
  tiers: OpportunityTierDefinition[];
  effectiveFrom: string;
};

export type IncentiveRunResult =
  | { ok: true; runId: string; inputHash: string; snapshot: IncentiveSnapshot }
  | { ok: false; errors: string[] };
