import type { IncentivePlan, SalesPhaseWeights } from "@/types/incentives";
import { buildDefaultLayerMatrix } from "./plan-matrix";
import { newIncentiveUuid } from "./uuid";

const DEFAULT_PHASES: SalesPhaseWeights = {
  lead_gen: 0.15,
  technical: 0.25,
  financial: 0.25,
  closing: 0.35,
};

export function createDefaultIncentivePlan(input: {
  organizationId: string;
  hrBusinessUnitId: string;
  companyId?: string;
  name?: string;
}): IncentivePlan {
  const now = new Date().toISOString().slice(0, 10);
  const plan: IncentivePlan = {
    id: newIncentiveUuid(),
    organizationId: input.organizationId,
    hrBusinessUnitId: input.hrBusinessUnitId,
    companyId: input.companyId,
    version: 1,
    status: "draft",
    name: input.name ?? "Default BD incentive plan",
    currency: "SAR",
    effectiveFrom: now,
    effectiveTo: null,
    stackingPolicy: "multiplicative_cap",
    reservePct: 5,
    revision: 1,
    stackingRules: {
      referralMultiplier: 1.1,
      newClientMultiplier: 1.05,
      knownBudgetMultiplier: 1.03,
      internalPlusVendorsMultiplier: 1.08,
      megaTierMultiplier: 1.05,
    },
    warningThresholds: {
      maxNpExposureRatio: 0.15,
      maxMegaTierShare: 0.45,
      maxReferralShare: 0.35,
      minPayoutLagMonths: 1,
      maxPayoutToMarginRatio: 0.5,
      maxCollectionsLagMonths: 6,
    },
    governance: {
      status: "draft",
      revision: 1,
      auditRevision: 1,
      owner: null,
      approvedBy: null,
      approvedAt: null,
      parentPlanVersionId: null,
    },
    layers: [
      {
        id: "layer-lead",
        key: "lead_gen",
        label: "Lead generation",
        sortOrder: 1,
        defaultSplitPct: 9,
        allocationPolicy: "equal",
      },
      {
        id: "layer-tech",
        key: "technical",
        label: "Technical",
        sortOrder: 2,
        defaultSplitPct: 19,
        allocationPolicy: "equal",
      },
      {
        id: "layer-fin",
        key: "financial",
        label: "Financial",
        sortOrder: 3,
        defaultSplitPct: 14,
        allocationPolicy: "equal",
      },
      {
        id: "layer-close",
        key: "closer",
        label: "Closing",
        sortOrder: 4,
        defaultSplitPct: 38,
        allocationPolicy: "equal",
      },
      {
        id: "layer-mgr",
        key: "sales_manager",
        label: "Sales management",
        sortOrder: 5,
        defaultSplitPct: 9,
        allocationPolicy: "equal",
      },
      {
        id: "layer-ref",
        key: "referrer",
        label: "Referrer",
        sortOrder: 6,
        defaultSplitPct: 6,
        allocationPolicy: "equal",
      },
    ],
    rules: [
      {
        id: "rule-tiny",
        tierKey: "tiny",
        referral: "any",
        clientType: "any",
        complexity: "any",
        payoutBasis: "order",
        rateType: "percent_of_margin",
        rateValue: 0.06,
        phaseWeights: DEFAULT_PHASES,
        maxPayoutPctOfMargin: 0.12,
      },
      {
        id: "rule-standard",
        tierKey: "standard",
        referral: "any",
        clientType: "any",
        complexity: "any",
        payoutBasis: "order",
        rateType: "percent_of_margin",
        rateValue: 0.08,
        phaseWeights: DEFAULT_PHASES,
        maxPayoutPctOfMargin: 0.15,
      },
      {
        id: "rule-big-referral",
        tierKey: "big",
        referral: "referral",
        clientType: "new_client",
        complexity: "any",
        payoutBasis: "order",
        rateType: "percent_of_margin",
        rateValue: 0.1,
        phaseWeights: DEFAULT_PHASES,
        maxPayoutPctOfMargin: 0.18,
      },
      {
        id: "rule-mega",
        tierKey: "mega",
        referral: "any",
        clientType: "any",
        complexity: "any",
        payoutBasis: "collections",
        rateType: "percent_of_margin",
        rateValue: 0.12,
        phaseWeights: { lead_gen: 0.15, technical: 0.25, financial: 0.3, closing: 0.3 },
        maxPayoutPctOfMargin: 0.2,
      },
    ],
    roleOverrides: [],
    scorecard: {
      periodYear: new Date().getFullYear(),
      components: [
        {
          id: "sc-fin",
          componentKey: "financial",
          weight: 0.8,
          targetValue: 1,
          actualSource: "sales_plan",
          targetGrain: "quarterly",
          overAchievementPolicy: "linear",
          accelerator: { thresholdPct: 0.8, rateAbove: 0.1, capMultiplier: 1.1 },
        },
        {
          id: "sc-new",
          componentKey: "new_clients",
          weight: 0.1,
          targetValue: 3,
          actualSource: "manual",
          targetGrain: "quarterly",
        },
        {
          id: "sc-svc",
          componentKey: "specific_service",
          weight: 0.1,
          targetValue: 1,
          actualSource: "sales_plan",
          targetGrain: "quarterly",
        },
      ],
    },
    payoutDrivers: [
      { type: "order_signed", recognitionPct: 0.5, payoutLagMonths: 0 },
      { type: "collection_received", recognitionPct: 0.5, payoutLagMonths: 3 },
    ],
    approvedAt: null,
    approvedBy: null,
    referrerShareOfCommission: 0.5,
    referralRateByTier: {
      tiny: 0.04,
      standard: 0.06,
      big: 0.08,
      mega: 0.1,
    },
    managerTeamRule: {
      teamAchievedMinPct: 0.8,
      teamOverPct: 1,
      managerFullMultiplier: 1,
      managerUnderTeamMultiplier: 0.85,
      managerOverTeamBonusPct: 0.1,
    },
    bdPhasePolicy: {
      defaultPhaseWeights: DEFAULT_PHASES,
      leadTypeMultipliers: { normal: 1, known_budget: 1.1 },
      proposalTypeMultipliers: {
        internal_team: 1,
        internal_plus_vendors: 1.08,
      },
    },
    participantAssignments: [],
    hrHierarchy: [],
    tierProfiles: [],
    tierForceOverrides: [],
  };
  plan.layerMatrix = buildDefaultLayerMatrix(plan);
  return plan;
}
