import type { IncentivePlan, SalesPhaseWeights } from "@/types/incentives";
import { OPPORTUNITY_TIER_KEYS, sumLayerMatrixForTier } from "./plan-matrix";

function phaseSum(weights: SalesPhaseWeights): number {
  return (
    weights.lead_gen +
    weights.technical +
    weights.financial +
    weights.closing
  );
}

export function validateIncentivePlan(plan: IncentivePlan): string[] {
  const errors: string[] = [];
  const layerSum = plan.layers.reduce((s, l) => s + l.defaultSplitPct, 0);
  if (layerSum + plan.reservePct > 100.01) {
    errors.push(
      `Layer splits (${layerSum}%) + reserve (${plan.reservePct}%) exceed 100%`
    );
  }
  const scoreSum = plan.scorecard.components.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(scoreSum - 1) > 0.01) {
    errors.push(`Scorecard weights must sum to 1 (got ${scoreSum})`);
  }
  for (const rule of plan.rules) {
    const ps = phaseSum(rule.phaseWeights);
    if (Math.abs(ps - 1) > 0.01) {
      errors.push(`Rule ${rule.id}: phase weights must sum to 1 (got ${ps})`);
    }
  }
  if (!plan.layers.length) errors.push("Plan must define at least one layer");
  if (!plan.rules.length) errors.push("Plan must define at least one rule");

  if (plan.referralRateByTier) {
    for (const [tier, rate] of Object.entries(plan.referralRateByTier)) {
      if (rate != null && (rate < 0 || rate > 1)) {
        errors.push(`Referral rate for ${tier} must be between 0 and 1`);
      }
    }
  }

  if (plan.layerMatrix?.length) {
    for (const tier of OPPORTUNITY_TIER_KEYS) {
      const sum = sumLayerMatrixForTier(plan, tier);
      if (sum + plan.reservePct > 100.01) {
        errors.push(
          `Layer matrix for tier ${tier} (${sum.toFixed(1)}%) + reserve exceeds 100%`
        );
      }
    }
  }

  if (plan.managerTeamRule) {
    const r = plan.managerTeamRule;
    if (r.teamAchievedMinPct > r.teamOverPct) {
      errors.push("Manager team: achieved min must be <= over threshold");
    }
  }

  return errors;
}
