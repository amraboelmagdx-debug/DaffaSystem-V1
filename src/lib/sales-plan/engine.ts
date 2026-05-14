/**
 * Revenue Planning OS — pure calculation helpers.
 * Complements workbook-engine (fixed / CM / NP target) with operational funnel math.
 */

import type { ConversionRates, QuarterlyWeights } from "@/types/sales-plan";
import {
  computeWorkbookTargets,
  salesTargetFromBlendedMargin,
} from "@/lib/planning/workbook-engine";

const EPS = 1e-9;

export function sumMonthlyFixedCosts(lines: { amountMonthly: number }[]): number {
  return lines.reduce((s, l) => s + Math.max(0, l.amountMonthly), 0);
}

export function yearlyBurnFromMonthly(monthly: number): number {
  return monthly * 12;
}

/** NP target = 0 → revenue where contribution covers fixed (simplified single-period). */
export function breakEvenRevenue(fixedMonthly: number, blendedCm: number): number {
  const cm = Math.min(0.999, Math.max(EPS, blendedCm));
  return fixedMonthly / cm;
}

export function minimumRevenueRequired(
  fixedMonthly: number,
  blendedCm: number,
  npTargetPct: number
): number {
  return salesTargetFromBlendedMargin(fixedMonthly, blendedCm, npTargetPct);
}

export function computeTargetsFromPlan(input: {
  fixedMonthly: number;
  blendedCm: number;
  npTargetPct: number;
}) {
  return computeWorkbookTargets({
    fixedCosts: input.fixedMonthly,
    npTargetPct: input.npTargetPct,
    blendedContributionMargin: input.blendedCm,
  });
}

export type AwardRequirementResult = {
  requiredCount: number;
  effectiveRevenueSar: number;
  /** True when target revenue &lt; ADV — business floors to one deal at ADV. */
  flooredToMinDeal: boolean;
  assumedAvgDealSar: number;
};

/**
 * Required awards ≈ revenue / ADV, with critical edge case:
 * if revenue target &lt; ADV → need 1 award and effective revenue becomes ADV.
 */
export function requiredAwardsFromRevenue(
  revenueTargetSar: number,
  avgDealValueSar: number
): AwardRequirementResult {
  const adv = Math.max(EPS, avgDealValueSar);
  const target = Math.max(0, revenueTargetSar);
  if (target <= EPS) {
    return {
      requiredCount: 0,
      effectiveRevenueSar: 0,
      flooredToMinDeal: false,
      assumedAvgDealSar: adv,
    };
  }
  if (target < adv - EPS) {
    return {
      requiredCount: 1,
      effectiveRevenueSar: adv,
      flooredToMinDeal: true,
      assumedAvgDealSar: adv,
    };
  }
  const raw = target / adv;
  const requiredCount = Math.max(1, Math.ceil(raw - EPS));
  return {
    requiredCount,
    effectiveRevenueSar: target,
    flooredToMinDeal: false,
    assumedAvgDealSar: adv,
  };
}

/** Back-solve funnel volumes from required awards (global single funnel). */
export function funnelVolumesFromAwards(
  requiredAwards: number,
  rates: ConversionRates
): {
  biddings: number;
  qualifiedOpps: number;
  leads: number;
  contacts: number;
} {
  const awards = Math.max(0, requiredAwards);
  const biddings = awards / Math.max(EPS, rates.biddingToAward);
  const qualifiedOpps = biddings / Math.max(EPS, rates.qualifiedOppToBidding);
  const leads = qualifiedOpps / Math.max(EPS, rates.leadToQualifiedOpp);
  const contacts = leads / Math.max(EPS, rates.contactToLead);
  return {
    biddings: Math.ceil(biddings - EPS),
    qualifiedOpps: Math.ceil(qualifiedOpps - EPS),
    leads: Math.ceil(leads - EPS),
    contacts: Math.ceil(contacts - EPS),
  };
}

export function normalizeQuarterlyWeights(w: QuarterlyWeights): QuarterlyWeights {
  const sum = w.q1 + w.q2 + w.q3 + w.q4 || 1;
  return {
    q1: w.q1 / sum,
    q2: w.q2 / sum,
    q3: w.q3 / sum,
    q4: w.q4 / sum,
  };
}

export type QuarterKey = "q1" | "q2" | "q3" | "q4";

export function quarterlyOperationalTargets(input: {
  annualRevenueSar: number;
  avgDealValueSar: number;
  rates: ConversionRates;
  quarterly: QuarterlyWeights;
}): Record<QuarterKey, ReturnType<typeof funnelVolumesFromAwards> & { revenueSar: number }> {
  const qn = normalizeQuarterlyWeights(input.quarterly);
  const keys: QuarterKey[] = ["q1", "q2", "q3", "q4"];
  const out = {} as Record<
    QuarterKey,
    ReturnType<typeof funnelVolumesFromAwards> & { revenueSar: number }
  >;
  for (const k of keys) {
    const rev = input.annualRevenueSar * qn[k];
    const awards = requiredAwardsFromRevenue(rev, input.avgDealValueSar).requiredCount;
    const funnel = funnelVolumesFromAwards(awards, input.rates);
    out[k] = { ...funnel, revenueSar: rev };
  }
  return out;
}

/** Weighted CM: Σ_s w_s * Σ_t m_{s,t} * mix_{s,t} (only existing cells). */
export function weightedBlendedCm(input: {
  serviceWeights: { serviceId: string; weight: number }[];
  cells: {
    serviceId: string;
    tierKey: string;
    exists: boolean;
    cm: number;
    mix: number;
  }[];
}): number {
  const byService = new Map<string, { weight: number; cm: number }>();
  for (const sw of input.serviceWeights) {
    byService.set(sw.serviceId, { weight: Math.max(0, sw.weight), cm: 0 });
  }
  for (const c of input.cells) {
    if (!c.exists) continue;
    const row = byService.get(c.serviceId);
    if (!row) continue;
    const m = Math.min(0.999, Math.max(0, c.cm));
    const mix = Math.max(0, c.mix);
    row.cm += m * mix;
  }
  let total = 0;
  let wsum = 0;
  for (const [, v] of byService) {
    total += v.weight * v.cm;
    wsum += v.weight;
  }
  if (wsum <= EPS) return 0;
  return Math.min(0.999, Math.max(0, total / wsum));
}

/** Volume-weighted average deal size across services × tiers (exists + mix only). */
export function weightedPortfolioAdv(input: {
  serviceWeights: { serviceId: string; weight: number }[];
  cells: {
    serviceId: string;
    exists: boolean;
    adv: number;
    mix: number;
  }[];
}): number {
  let num = 0;
  let den = 0;
  for (const sw of input.serviceWeights) {
    const w = Math.max(0, sw.weight);
    if (w <= EPS) continue;
    let inner = 0;
    let mixSum = 0;
    for (const c of input.cells) {
      if (c.serviceId !== sw.serviceId || !c.exists) continue;
      inner += Math.max(0, c.adv) * Math.max(0, c.mix);
      mixSum += Math.max(0, c.mix);
    }
    const avgAdv = mixSum > EPS ? inner / mixSum : 0;
    num += w * avgAdv;
    den += w;
  }
  if (den <= EPS) return 0;
  return num / den;
}
