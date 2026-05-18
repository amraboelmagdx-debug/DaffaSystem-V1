import type {
  IncentiveDealInput,
  IncentiveOperationalWarning,
  IncentivePlan,
  IncentiveSnapshot,
  IncentiveWarningThresholds,
} from "@/types/incentives";

const DEFAULT_THRESHOLDS: IncentiveWarningThresholds = {
  maxNpExposureRatio: 0.15,
  maxMegaTierShare: 0.45,
  maxReferralShare: 0.35,
  minPayoutLagMonths: 1,
  maxPayoutToMarginRatio: 0.5,
  maxCollectionsLagMonths: 6,
};

export type OperationalWarningContext = {
  deals: IncentiveDealInput[];
  projectedRevenueSar?: number;
  npTargetPct?: number;
  teamFinancialAttainment?: number;
  managerLayerPayoutSar?: number;
};

function thresholds(plan: IncentivePlan): IncentiveWarningThresholds {
  return { ...DEFAULT_THRESHOLDS, ...plan.warningThresholds };
}

export function evaluateOperationalWarnings(
  plan: IncentivePlan,
  snapshot: IncentiveSnapshot,
  ctx: OperationalWarningContext
): IncentiveOperationalWarning[] {
  const t = thresholds(plan);
  const warnings: IncentiveOperationalWarning[] = [];

  const totalPool = snapshot.companyTotalSar;
  if (totalPool <= 0) return warnings;

  if (ctx.projectedRevenueSar && ctx.projectedRevenueSar > 0 && ctx.npTargetPct) {
    const exposure = snapshot.annual.accrualTotalSar / ctx.projectedRevenueSar;
    const maxRatio = t.maxNpExposureRatio ?? 0.15;
    if (exposure > maxRatio) {
      warnings.push({
        code: "NP_EXPOSURE_HIGH",
        severity: exposure > maxRatio * 1.5 ? "critical" : "warn",
        message: "Incentive accrual exceeds safe NP exposure ratio for projected revenue",
        explainInputs: {
          accrualSar: snapshot.annual.accrualTotalSar,
          projectedRevenueSar: ctx.projectedRevenueSar,
          exposureRatio: exposure,
          maxRatio,
        },
      });
    }
  }

  const marginSum = ctx.deals.reduce((s, d) => s + (d.marginSar ?? 0), 0);
  if (marginSum > 0) {
    const payoutRatio = totalPool / marginSum;
    const maxPayout = t.maxPayoutToMarginRatio ?? 0.5;
    if (payoutRatio > maxPayout) {
      warnings.push({
        code: "PAYOUT_VS_MARGIN",
        severity: "warn",
        message: "Total incentive pool exceeds margin threshold",
        explainInputs: { totalPool, marginSum, payoutRatio, maxPayout },
      });
    }
  }

  const megaDeals = ctx.deals.filter((d) => d.tierKey === "mega");
  const megaPool = megaDeals.reduce((s, d) => s + (snapshot.byDeal[d.id] ?? 0), 0);
  const megaShare = megaPool / totalPool;
  if (megaShare > (t.maxMegaTierShare ?? 0.45)) {
    warnings.push({
      code: "MEGA_CONCENTRATION",
      severity: "warn",
      message: "High concentration of incentive pool in Mega-tier deals",
      explainInputs: { megaShare, megaPool, dealCount: megaDeals.length },
    });
  }

  const referralDeals = ctx.deals.filter((d) => d.referral);
  const referralPool = referralDeals.reduce(
    (s, d) => s + (snapshot.byDeal[d.id] ?? 0),
    0
  );
  const referralShare = referralPool / totalPool;
  if (referralShare > (t.maxReferralShare ?? 0.35)) {
    warnings.push({
      code: "REFERRAL_CONCENTRATION",
      severity: "info",
      message: "Referral deals represent a large share of the incentive pool",
      explainInputs: { referralShare, referralPool },
    });
  }

  let lagMonths = 0;
  let lagCount = 0;
  for (const line of snapshot.lines) {
    const acc = line.accrualMonth.slice(0, 7);
    const pay = line.payoutMonth.slice(0, 7);
    if (acc === pay) continue;
    const [ay, am] = acc.split("-").map(Number);
    const [py, pm] = pay.split("-").map(Number);
    const months = (py - ay) * 12 + (pm - am);
    if (months > 0) {
      lagMonths += months;
      lagCount += 1;
    }
  }
  const avgLag = lagCount > 0 ? lagMonths / lagCount : 0;
  const maxLag = t.maxCollectionsLagMonths ?? 6;
  if (avgLag > maxLag) {
    warnings.push({
      code: "COLLECTIONS_LAG",
      severity: "warn",
      message: "Payout months lag accrual beyond collections policy",
      explainInputs: { avgLagMonths: avgLag, maxLagMonths: maxLag },
    });
  }

  const minLag = t.minPayoutLagMonths ?? 1;
  if (avgLag > 0 && avgLag < minLag) {
    warnings.push({
      code: "AGGRESSIVE_PAYOUT_TIMING",
      severity: "info",
      message: "Average payout timing is faster than BU minimum lag policy",
      explainInputs: { avgLagMonths: avgLag, minLagMonths: minLag },
    });
  }

  if (
    ctx.managerLayerPayoutSar != null &&
    ctx.teamFinancialAttainment != null &&
    ctx.teamFinancialAttainment < 1 &&
    ctx.managerLayerPayoutSar > 0
  ) {
    warnings.push({
      code: "MANAGER_TEAM_DISCONNECT",
      severity: "warn",
      message: "Manager payout present while team financial attainment is below target",
      explainInputs: {
        managerPayoutSar: ctx.managerLayerPayoutSar,
        teamAttainment: ctx.teamFinancialAttainment,
      },
    });
  }

  snapshot.warnings.forEach((message, index) => {
    warnings.push({
      code: `ENGINE_WARNING_${index}`,
      severity: "warn",
      message,
      explainInputs: {},
    });
  });

  return warnings;
}
