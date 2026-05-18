import type { SalesPlanModel } from "@/lib/sales-plan/build-model";
import type {
  IncentiveScorecardComponent,
  IncentiveTargetScorecard,
} from "@/types/incentives";
import type { DemoOpportunity } from "@/types/domain";

export type ScorecardBridgeResult = {
  multiplier: number;
  attainmentByComponent: Record<string, number>;
  explainInputs: Record<string, number | string>;
};

function attainmentForComponent(
  c: IncentiveScorecardComponent,
  model: SalesPlanModel | null,
  opportunities: DemoOpportunity[]
): number {
  if (c.actualValue != null && c.actualValue > 0) return c.actualValue;

  if (!model && c.actualSource !== "manual") return 0;

  switch (c.componentKey) {
    case "financial":
      return model && c.targetValue > 0 ? model.annualRevenueSar / c.targetValue : 0;
    case "opportunity_type":
      return model && c.targetValue > 0
        ? (model.awardAnnual?.requiredCount ?? 0) / c.targetValue
        : 0;
    case "specific_service": {
      if (!model || c.targetValue <= 0) return 0;
      const top = model.serviceRollups?.[0];
      return top ? top.revenueSar / c.targetValue : 0;
    }
    case "new_clients": {
      const count = opportunities.filter(
        (o) => o.clientType === "new_client" && o.stage === "closed_won"
      ).length;
      return c.targetValue > 0 ? count / c.targetValue : 0;
    }
    case "client_segment": {
      if (!model || c.targetValue <= 0) return 0;
      const top = model.segmentRevenue?.[0];
      return top ? top.revenueSar / c.targetValue : 0;
    }
    default:
      return 0;
  }
}

function applyAccelerator(
  attainment: number,
  c: IncentiveScorecardComponent
): number {
  const accel = c.accelerator;
  if (!accel || c.overAchievementPolicy === "none") {
    return Math.min(2, Math.max(0, attainment));
  }
  if (attainment <= accel.thresholdPct) {
    return Math.min(2, Math.max(0, attainment));
  }
  const excess = attainment - accel.thresholdPct;
  const boosted = accel.thresholdPct + excess * (1 + accel.rateAbove);
  return Math.min(accel.capMultiplier, Math.max(0, boosted));
}

/**
 * Maps Sales Plan + pipeline into scorecard attainment and pool multiplier.
 */
export function scorecardAttainmentFromSalesPlan(
  scorecard: IncentiveTargetScorecard,
  model: SalesPlanModel | null,
  opportunities: DemoOpportunity[] = []
): ScorecardBridgeResult {
  if (!model && !opportunities.length) {
    return { multiplier: 1, attainmentByComponent: {}, explainInputs: {} };
  }

  const attainmentByComponent: Record<string, number> = {};
  const componentAttainments: { id: string; att: number; weight: number; dependsOn?: string | null }[] =
    [];

  for (const c of scorecard.components) {
    let att = attainmentForComponent(c, model, opportunities);
    att = applyAccelerator(att, c);
    attainmentByComponent[c.id] = att;
    componentAttainments.push({
      id: c.id,
      att,
      weight: c.weight,
      dependsOn: c.dependsOnComponentId,
    });
  }

  for (const row of componentAttainments) {
    if (!row.dependsOn) continue;
    const parent = attainmentByComponent[row.dependsOn] ?? 0;
    if (parent < 1) {
      attainmentByComponent[row.id] = Math.min(
        attainmentByComponent[row.id] ?? 0,
        parent
      );
    }
  }

  let weighted = 0;
  let weightSum = 0;
  for (const c of scorecard.components) {
    const att = attainmentByComponent[c.id] ?? 0;
    weighted += att * c.weight;
    weightSum += c.weight;
  }

  const avg = weightSum > 0 ? weighted / weightSum : 1;
  const multiplier = Math.min(1.25, Math.max(0.75, 0.75 + avg * 0.5));

  return {
    multiplier,
    attainmentByComponent,
    explainInputs: { weightedAvg: avg, weightSum },
  };
}
