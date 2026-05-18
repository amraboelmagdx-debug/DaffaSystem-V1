import type { EvaluateIncentiveRunOptions, IncentivePlan } from "@/types/incentives";
import { DEFAULT_EVALUATE_INCENTIVE_RUN_OPTIONS } from "@/types/incentives";

/** Derive engine v2 flags from plan capabilities (production UI). */
export function deriveEvaluateOptionsFromPlan(plan: IncentivePlan): EvaluateIncentiveRunOptions {
  return {
    ...DEFAULT_EVALUATE_INCENTIVE_RUN_OPTIONS,
    applyReserve: plan.reservePct > 0,
    usePlanStackingRules: Boolean(plan.stackingRules),
    usePayoutDrivers: (plan.payoutDrivers?.length ?? 0) > 0,
    useParticipantWeights: (plan.participantAssignments?.length ?? 0) > 0,
    useRoleOverrides: (plan.roleOverrides?.length ?? 0) > 0,
    applyPhaseWeights:
      Boolean(plan.bdPhasePolicy) ||
      plan.rules.some(
        (r) =>
          r.phaseWeights.lead_gen +
            r.phaseWeights.technical +
            r.phaseWeights.financial +
            r.phaseWeights.closing !==
          1
      ),
    useLayerMatrix: (plan.layerMatrix?.length ?? 0) > 0,
    useReferrerShare: (plan.referrerShareOfCommission ?? 0) > 0,
    useReferralRateByTier:
      Boolean(plan.referralRateByTier) &&
      Object.keys(plan.referralRateByTier ?? {}).length > 0 &&
      (plan.referrerShareOfCommission ?? 0) <= 0,
    applyManagerTeamRule: Boolean(plan.managerTeamRule),
  };
}
