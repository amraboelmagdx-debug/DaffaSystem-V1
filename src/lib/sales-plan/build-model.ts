/**
 * Single source of truth for derived sales-plan analytics (rollups, insights, charts).
 */

import type {
  ContributionCell,
  ConversionRates,
  MarketSegmentShare,
  OpportunityTierKey,
  ProductServiceLine,
  QuarterlyWeights,
} from "@/types/sales-plan";
import {
  computeTargetsFromPlan,
  funnelVolumesFromAwards,
  quarterlyOperationalTargets,
  requiredAwardsFromRevenue,
  weightedPortfolioAdv,
} from "@/lib/sales-plan/engine";
import { weightedAdvForService } from "@/lib/sales-plan/weighted-adv";

const EPS = 1e-9;

const TIER_KEYS: OpportunityTierKey[] = ["tiny", "standard", "big", "mega"];

export type PlanningInsightId =
  | "serviceShareDrift"
  | "segmentShareDrift"
  | "tierMixDrift"
  | "megaDependency"
  | "quarterOverload"
  | "npUnreachable"
  | "minDealFloor"
  | "capacitySevere"
  | "capacityPressure"
  | "governmentShareCap";

export type PlanningInsight = {
  id: PlanningInsightId;
  severity: "info" | "warning" | "critical";
};

export type TierRollupRow = {
  serviceId: string;
  serviceName: string;
  tierKey: OpportunityTierKey;
  revenueSar: number;
  contributionSar: number;
  variableCostSar: number;
  awardsRequired: number;
  flooredToMinDeal: boolean;
  profitAfterAllocatedFixedSar: number;
};

export type ServiceRollup = {
  serviceId: string;
  serviceName: string;
  revenueSar: number;
  awardsRequired: number;
  funnel: ReturnType<typeof funnelVolumesFromAwards>;
};

export type ChartSeries = {
  revenueByTier: { tier: OpportunityTierKey; revenue: number }[];
  revenueByService: { name: string; revenue: number }[];
  quarterly: { quarter: string; revenue: number; awards: number }[];
  funnelGlobal: { stage: string; value: number }[];
};

export type CapacityModel = {
  loadIndex: number;
  baselineCapacity: number;
  utilizationPct: number;
  pressure: "low" | "moderate" | "high" | "severe";
};

export type SalesPlanModel = {
  targets: ReturnType<typeof computeTargetsFromPlan>;
  annualRevenueSar: number;
  portfolioAdv: number;
  awardAnnual: ReturnType<typeof requiredAwardsFromRevenue>;
  funnelGlobal: ReturnType<typeof funnelVolumesFromAwards>;
  quarterlyOps: ReturnType<typeof quarterlyOperationalTargets>;
  tierRollups: TierRollupRow[];
  serviceRollups: ServiceRollup[];
  segmentRevenue: { segment: MarketSegmentShare["segment"]; revenueSar: number }[];
  insights: PlanningInsight[];
  capacity: CapacityModel;
  charts: ChartSeries;
  shareSumRaw: number;
  segmentSumRaw: number;
  megaPortfolioShare: number;
  q4Weight: number;
};

function normalizePositiveWeights(
  keys: string[],
  raw: Record<string, number>
): Record<string, number> {
  const sum = keys.reduce((a, k) => a + Math.max(0, raw[k] ?? 0), 0);
  if (sum < EPS) {
    const u = 1 / (keys.length || 1);
    return Object.fromEntries(keys.map((k) => [k, u]));
  }
  return Object.fromEntries(keys.map((k) => [k, Math.max(0, raw[k] ?? 0) / sum]));
}

function normalizeTierMixForService(
  mix: Partial<Record<OpportunityTierKey, number>>,
  existingTiers: OpportunityTierKey[]
): Record<OpportunityTierKey, number> {
  if (!existingTiers.length) {
    return { tiny: 0, standard: 0, big: 0, mega: 0 };
  }
  const sum = existingTiers.reduce((a, k) => a + Math.max(0, mix[k] ?? 0), 0);
  if (sum < EPS) {
    const u = 1 / existingTiers.length;
    return Object.fromEntries(TIER_KEYS.map((k) => [k, existingTiers.includes(k) ? u : 0])) as Record<
      OpportunityTierKey,
      number
    >;
  }
  const out = { tiny: 0, standard: 0, big: 0, mega: 0 } as Record<OpportunityTierKey, number>;
  for (const k of existingTiers) {
    out[k] = Math.max(0, mix[k] ?? 0) / sum;
  }
  return out;
}

export type BuildSalesPlanModelInput = {
  products: ProductServiceLine[];
  serviceRevenueShare: Record<string, number>;
  tierMixByService: Record<string, Partial<Record<OpportunityTierKey, number>>>;
  contributionCells: Record<string, ContributionCell>;
  fixedMonthly: number;
  blendedCm: number;
  npTargetPct: number;
  conversionRates: ConversionRates;
  quarterlyWeights: QuarterlyWeights;
  marketSegments: MarketSegmentShare[];
};

export function buildSalesPlanModel(input: BuildSalesPlanModelInput): SalesPlanModel {
  const targets = computeTargetsFromPlan({
    fixedMonthly: input.fixedMonthly,
    blendedCm: input.blendedCm,
    npTargetPct: input.npTargetPct,
  });
  const annualRevenueSar = targets.salesTarget * 12;

  const productIds = input.products.map((p) => p.id);
  const shareNorm = normalizePositiveWeights(productIds, input.serviceRevenueShare);
  const shareSumRaw = productIds.reduce((a, id) => a + Math.max(0, input.serviceRevenueShare[id] ?? 0), 0);

  const engineCells: {
    serviceId: string;
    tierKey: OpportunityTierKey;
    exists: boolean;
    cm: number;
    mix: number;
    adv: number;
  }[] = [];

  for (const p of input.products) {
    const existingTiers = TIER_KEYS.filter((tk) => {
      const c = input.contributionCells[`${p.id}:${tk}`];
      return c?.exists;
    });
    const mixN = normalizeTierMixForService(input.tierMixByService[p.id] ?? {}, existingTiers);
    for (const tk of TIER_KEYS) {
      const cell = input.contributionCells[`${p.id}:${tk}`];
      if (!cell) continue;
      engineCells.push({
        serviceId: p.id,
        tierKey: tk,
        exists: cell.exists,
        cm: cell.contributionMarginPct,
        mix: mixN[tk] ?? 0,
        adv: cell.avgDealValueSar,
      });
    }
  }

  const serviceWeights = productIds.map((id) => ({ serviceId: id, weight: shareNorm[id] ?? 0 }));

  const portfolioAdv = weightedPortfolioAdv({
    serviceWeights,
    cells: engineCells.map(({ serviceId, exists, adv, mix }) => ({ serviceId, exists, adv, mix })),
  });

  const awardAnnual = requiredAwardsFromRevenue(annualRevenueSar, portfolioAdv || 1);
  const funnelGlobal = funnelVolumesFromAwards(awardAnnual.requiredCount, input.conversionRates);
  const quarterlyOps = quarterlyOperationalTargets({
    annualRevenueSar,
    avgDealValueSar: portfolioAdv || 1,
    rates: input.conversionRates,
    quarterly: input.quarterlyWeights,
  });

  const tierRollups: TierRollupRow[] = [];
  for (const p of input.products) {
    const existingTiers = TIER_KEYS.filter((tk) => input.contributionCells[`${p.id}:${tk}`]?.exists);
    const mixN = normalizeTierMixForService(input.tierMixByService[p.id] ?? {}, existingTiers);
    for (const tk of TIER_KEYS) {
      const cell = input.contributionCells[`${p.id}:${tk}`];
      if (!cell?.exists) continue;
      const m = mixN[tk] ?? 0;
      const revenueSar = annualRevenueSar * (shareNorm[p.id] ?? 0) * m;
      const ar = requiredAwardsFromRevenue(revenueSar, cell.avgDealValueSar);
      const contributionSar = revenueSar * cell.contributionMarginPct;
      const variableCostSar =
        revenueSar * (1 - cell.contributionMarginPct) + ar.requiredCount * cell.deliveryCostSar;
      tierRollups.push({
        serviceId: p.id,
        serviceName: p.name,
        tierKey: tk,
        revenueSar,
        contributionSar,
        variableCostSar,
        awardsRequired: ar.requiredCount,
        flooredToMinDeal: ar.flooredToMinDeal,
        profitAfterAllocatedFixedSar: 0,
      });
    }
  }

  const totalTierRev = tierRollups.reduce((a, r) => a + r.revenueSar, 0);
  const fixedAnnual = input.fixedMonthly * 12;
  for (const row of tierRollups) {
    const alloc = totalTierRev > EPS ? fixedAnnual * (row.revenueSar / totalTierRev) : 0;
    row.profitAfterAllocatedFixedSar = row.contributionSar - alloc;
  }

  const serviceRollups: ServiceRollup[] = input.products.map((p) => {
    const revS = annualRevenueSar * (shareNorm[p.id] ?? 0);
    const advS =
      weightedAdvForService(
        p.id,
        engineCells.map((c) => ({
          serviceId: c.serviceId,
          tierKey: c.tierKey,
          exists: c.exists,
          adv: c.adv,
          mix: c.mix,
        }))
      ) || 1;
    const awardsS = requiredAwardsFromRevenue(revS, advS).requiredCount;
    return {
      serviceId: p.id,
      serviceName: p.name,
      revenueSar: revS,
      awardsRequired: awardsS,
      funnel: funnelVolumesFromAwards(awardsS, input.conversionRates),
    };
  });

  const segmentSumRaw = input.marketSegments.reduce((a, s) => a + Math.max(0, s.targetPct), 0);
  const segNorm = normalizePositiveWeights(
    input.marketSegments.map((s) => s.segment),
    Object.fromEntries(input.marketSegments.map((s) => [s.segment, s.targetPct]))
  );
  const segmentRevenue = input.marketSegments.map((s) => ({
    segment: s.segment,
    revenueSar: annualRevenueSar * (segNorm[s.segment] ?? 0),
  }));

  let megaPortfolioShare = 0;
  for (const p of input.products) {
    const existingTiers = TIER_KEYS.filter((tk) => input.contributionCells[`${p.id}:${tk}`]?.exists);
    const mixN = normalizeTierMixForService(input.tierMixByService[p.id] ?? {}, existingTiers);
    megaPortfolioShare += (shareNorm[p.id] ?? 0) * (mixN.mega ?? 0);
  }

  const qn = input.quarterlyWeights;
  const qsum = qn.q1 + qn.q2 + qn.q3 + qn.q4 || 1;
  const q4Weight = qn.q4 / qsum;

  const insights: PlanningInsight[] = [];

  if (input.products.length > 0 && Math.abs(shareSumRaw - 1) > 0.03) {
    insights.push({ id: "serviceShareDrift", severity: "warning" });
  }
  if (input.products.length > 0 && Math.abs(segmentSumRaw - 1) > 0.03) {
    insights.push({ id: "segmentShareDrift", severity: "warning" });
  }
  const govSeg = input.marketSegments.find((s) => s.segment === "governmental");
  if (input.products.length > 0 && govSeg && govSeg.targetPct > 0.4 + EPS) {
    insights.push({ id: "governmentShareCap", severity: "warning" });
  }
  for (const p of input.products) {
    const existingTiers = TIER_KEYS.filter((tk) => input.contributionCells[`${p.id}:${tk}`]?.exists);
    const rawMix = input.tierMixByService[p.id] ?? {};
    const mixSum = existingTiers.reduce((a, tk) => a + Math.max(0, rawMix[tk] ?? 0), 0);
    if (existingTiers.length > 0 && Math.abs(mixSum - 1) > 0.04 && mixSum > EPS) {
      insights.push({ id: "tierMixDrift", severity: "warning" });
      break;
    }
  }
  if (megaPortfolioShare > 0.32) {
    insights.push({ id: "megaDependency", severity: "warning" });
  }
  if (q4Weight > 0.38) {
    insights.push({ id: "quarterOverload", severity: "warning" });
  }
  if (input.blendedCm <= input.npTargetPct + 0.02 && input.fixedMonthly > EPS) {
    insights.push({ id: "npUnreachable", severity: "critical" });
  }
  if (tierRollups.some((r) => r.flooredToMinDeal)) {
    insights.push({ id: "minDealFloor", severity: "info" });
  }

  let loadIndex = 0;
  let baselineCapacity = 0;
  for (const p of input.products) {
    const sr = serviceRollups.find((x) => x.serviceId === p.id);
    const awards = sr?.awardsRequired ?? 0;
    loadIndex += awards * p.operationalComplexity * (0.55 + p.strategicImportance);
    baselineCapacity += 10 * (0.35 + p.scalabilityScore) * (1.1 - p.operationalComplexity * 0.05);
  }
  if (baselineCapacity < EPS) baselineCapacity = 1;
  const utilizationPct = Math.min(100, (loadIndex / baselineCapacity) * 42);
  let pressure: CapacityModel["pressure"] = "low";
  if (utilizationPct >= 88) pressure = "severe";
  else if (utilizationPct >= 72) pressure = "high";
  else if (utilizationPct >= 52) pressure = "moderate";
  if (utilizationPct >= 92) {
    insights.push({ id: "capacitySevere", severity: "critical" });
  } else if (utilizationPct >= 80) {
    insights.push({ id: "capacityPressure", severity: "warning" });
  }

  const revenueByTierMap = new Map<OpportunityTierKey, number>();
  for (const tk of TIER_KEYS) revenueByTierMap.set(tk, 0);
  for (const r of tierRollups) {
    revenueByTierMap.set(r.tierKey, (revenueByTierMap.get(r.tierKey) ?? 0) + r.revenueSar);
  }
  const revenueByTier = TIER_KEYS.map((tier) => ({
    tier,
    revenue: revenueByTierMap.get(tier) ?? 0,
  }));

  const revenueByService = input.products.map((p) => ({
    name: p.name,
    revenue: annualRevenueSar * (shareNorm[p.id] ?? 0),
  }));

  const quarterly = (["q1", "q2", "q3", "q4"] as const).map((qk) => {
    const row = quarterlyOps[qk];
    const aw = requiredAwardsFromRevenue(row.revenueSar, portfolioAdv || 1).requiredCount;
    return { quarter: qk.toUpperCase(), revenue: row.revenueSar, awards: aw };
  });

  const funnelGlobalChart = [
    { stage: "contacts", value: funnelGlobal.contacts },
    { stage: "leads", value: funnelGlobal.leads },
    { stage: "opps", value: funnelGlobal.qualifiedOpps },
    { stage: "biddings", value: funnelGlobal.biddings },
    { stage: "awards", value: awardAnnual.requiredCount },
  ];

  return {
    targets,
    annualRevenueSar,
    portfolioAdv,
    awardAnnual,
    funnelGlobal,
    quarterlyOps,
    tierRollups,
    serviceRollups,
    segmentRevenue,
    insights,
    capacity: { loadIndex, baselineCapacity, utilizationPct, pressure },
    charts: {
      revenueByTier,
      revenueByService,
      quarterly,
      funnelGlobal: funnelGlobalChart,
    },
    shareSumRaw,
    segmentSumRaw,
    megaPortfolioShare,
    q4Weight,
  };
}
