import type {
  AssumptionAttributionResult,
  AssumptionDriverAttribution,
  AssumptionImpactEdge,
  AssumptionImpactMeasure,
  AttributeScenarioComparisonInput,
  AttributionConfidence,
  DriverContributions,
  DriverEffect,
  DriverRole,
  MeasureContribution,
  OperationalTradeoff,
  StrategicPressureIndicator,
} from "@/types/scenario-attribution";
import type { DeltaSignificance } from "@/types/scenario-comparison";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import { getChangedDrivers, type DriverSpec } from "./assumption-keys";
import {
  evaluateDriverCounterfactual,
  marginalFromSnapshots,
  snapshotMeasures,
  type MeasureSnapshot,
} from "./evaluate-counterfactual";
import { buildAttributionNarrative } from "./attribution-narrative";
import type { AttributionNarrativeLabels } from "@/types/scenario-attribution";

const EPS = 1e-9;

function significanceFromShare(sharePct: number | null): DeltaSignificance {
  if (sharePct === null || !Number.isFinite(sharePct)) return "low";
  const abs = Math.abs(sharePct);
  if (abs >= 25) return "high";
  if (abs >= 8) return "medium";
  return "low";
}

function shareOfTotal(absolute: number, total: number): number | null {
  if (Math.abs(total) < EPS) return absolute !== 0 ? null : 0;
  return (absolute / total) * 100;
}

function buildContributions(
  marginal: MeasureSnapshot,
  totalDelta: MeasureSnapshot
): DriverContributions {
  const mk = (absolute: number, total: number): MeasureContribution => ({
    absolute,
    shareOfTotalDeltaPct: shareOfTotal(absolute, total),
  });
  return {
    revenue: mk(marginal.revenue, totalDelta.revenue),
    netProfit: mk(marginal.netProfit, totalDelta.netProfit),
    grossProfit: mk(marginal.grossProfit, totalDelta.grossProfit),
    npPct: mk(marginal.npPct, totalDelta.npPct),
    salesGap: mk(marginal.salesGap, totalDelta.salesGap),
    workbookCm: mk(marginal.workbookCm, totalDelta.workbookCm),
  };
}

function driverEffect(c: DriverContributions): DriverEffect {
  const rev = c.revenue.absolute;
  const np = c.netProfit.absolute;
  if (Math.abs(rev) < EPS && Math.abs(np) < EPS) return "mixed";
  if (rev >= 0 && np >= 0) return "positive";
  if (rev <= 0 && np <= 0) return "negative";
  return "mixed";
}

function driverConfidence(
  spec: DriverSpec,
  significance: DeltaSignificance
): AttributionConfidence {
  if (spec.id === "workbook.tierOverrides") return significance === "high" ? "medium" : "low";
  return significance === "low" ? "medium" : "high";
}

function assignRoles(drivers: AssumptionDriverAttribution[]): AssumptionDriverAttribution[] {
  const sorted = [...drivers].sort(
    (a, b) => Math.abs(b.contributions.netProfit.absolute) - Math.abs(a.contributions.netProfit.absolute)
  );
  return sorted.map((d, i) => ({
    ...d,
    role: (i < 2 ? "primary" : i < 5 ? "secondary" : "other") as DriverRole,
  }));
}

function buildImpactGraph(drivers: AssumptionDriverAttribution[]): AssumptionImpactEdge[] {
  const edges: AssumptionImpactEdge[] = [];
  const measures: AssumptionImpactMeasure[] = [
    "revenue",
    "netProfit",
    "grossProfit",
    "npPct",
    "salesGap",
    "workbookCm",
  ];
  for (const d of drivers) {
    for (const m of measures) {
      const contrib = d.contributions[m === "salesGap" ? "salesGap" : m];
      const weight = Math.abs(contrib.absolute);
      if (weight < EPS) continue;
      edges.push({ driverId: d.id, measure: m, weight });
    }
  }
  return edges.sort((a, b) => b.weight - a.weight);
}

function buildTradeoffs(drivers: AssumptionDriverAttribution[]): OperationalTradeoff[] {
  const tradeoffs: OperationalTradeoff[] = [];
  const revUp = drivers.filter((d) => d.contributions.revenue.absolute > EPS);
  const npDown = drivers.filter((d) => d.contributions.netProfit.absolute < -EPS);
  if (revUp.length && npDown.length) {
    tradeoffs.push({
      id: "revenue-np-tradeoff",
      summaryKey: "revenueVsMargin",
      revenueDirection: "up",
      marginDirection: "down",
      driverIds: [...revUp.slice(0, 2), ...npDown.slice(0, 2)].map((d) => d.id),
    });
  }
  const gapUp = drivers.filter((d) => d.contributions.salesGap.absolute > EPS);
  if (gapUp.length && revUp.length) {
    tradeoffs.push({
      id: "growth-gap-tradeoff",
      summaryKey: "growthVsGap",
      revenueDirection: "up",
      marginDirection: "flat",
      driverIds: gapUp.slice(0, 2).map((d) => d.id),
    });
  }
  return tradeoffs;
}

function buildRiskIndicators(
  comparison: AttributeScenarioComparisonInput["comparison"]
): StrategicPressureIndicator[] {
  const indicators: StrategicPressureIndicator[] = [];
  const { governance, posture, capacityPressure, financial } = comparison;

  if (governance.riskLevel.changed) {
    indicators.push({
      id: "risk-level-shift",
      level: governance.riskLevel.compare === "high" ? "elevated" : "moderate",
      labelKey: "riskLevelShift",
      reasonKey: "riskLevelShiftReason",
    });
  }

  const util = posture.find((p) => p.field === "utilizationPosture");
  if (util?.shifted && util.compare === "high") {
    indicators.push({
      id: "utilization-pressure",
      level: "elevated",
      labelKey: "utilizationPressure",
      reasonKey: "utilizationPressureReason",
    });
  }

  if (financial.salesNeededGap.direction === "up" && financial.salesNeededGap.significance !== "low") {
    indicators.push({
      id: "sales-gap-widen",
      level: "moderate",
      labelKey: "salesGapWiden",
      reasonKey: "salesGapWidenReason",
    });
  }

  if (capacityPressure.delta.significance !== "low") {
    indicators.push({
      id: "capacity-proxy",
      level: capacityPressure.compareLabel === "high" ? "elevated" : "moderate",
      labelKey: "capacityProxy",
      reasonKey: "capacityProxyReason",
    });
  }

  return indicators;
}

export function attributeScenarioComparison(
  input: AttributeScenarioComparisonInput,
  labels?: AttributionNarrativeLabels
): AssumptionAttributionResult {
  const { comparison, context } = input;
  const baseBundle = mergeGovernanceOnHydrate(
    context.bundlesById[context.baseScenarioId]!
  );
  const compareBundle = mergeGovernanceOnHydrate(
    context.bundlesById[context.compareScenarioId]!
  );

  const baseEval = comparison.base;
  const compareEval = comparison.compare;
  const baseSnap = snapshotMeasures(baseEval);
  const compareSnap = snapshotMeasures(compareEval);
  const totalDelta: MeasureSnapshot = {
    revenue: compareSnap.revenue - baseSnap.revenue,
    netProfit: compareSnap.netProfit - baseSnap.netProfit,
    grossProfit: compareSnap.grossProfit - baseSnap.grossProfit,
    npPct: compareSnap.npPct - baseSnap.npPct,
    salesGap: compareSnap.salesGap - baseSnap.salesGap,
    workbookCm: compareSnap.workbookCm - baseSnap.workbookCm,
  };

  const evalCtx = {
    anchorCompany: context.anchorCompany,
    streams: context.streams,
    opportunities: context.opportunities,
  };

  const changedSpecs = getChangedDrivers(baseBundle, compareBundle);
  const rawDrivers: AssumptionDriverAttribution[] = [];

  for (const spec of changedSpecs) {
    const cfEval = evaluateDriverCounterfactual(evalCtx, baseBundle, compareBundle, spec);
    const marginal = marginalFromSnapshots(baseSnap, snapshotMeasures(cfEval));
    const contributions = buildContributions(marginal, totalDelta);
    const sig = significanceFromShare(contributions.netProfit.shareOfTotalDeltaPct);

    rawDrivers.push({
      id: spec.id,
      category: spec.category,
      role: "other",
      effect: driverEffect(contributions),
      confidence: driverConfidence(spec, sig),
      significance: sig,
      contributions,
      baseValue: spec.baseValue(baseBundle),
      compareValue: spec.compareValue(compareBundle),
    });
  }

  const drivers = assignRoles(rawDrivers);
  const byCategory: AssumptionAttributionResult["byCategory"] = {};
  for (const d of drivers) {
    const list = byCategory[d.category] ?? [];
    list.push(d);
    byCategory[d.category] = list;
  }

  const sumNp = drivers.reduce((s, d) => s + d.contributions.netProfit.absolute, 0);
  const sumRev = drivers.reduce((s, d) => s + d.contributions.revenue.absolute, 0);

  const result: AssumptionAttributionResult = {
    meta: {
      companyId: comparison.meta.companyId,
      baseScenarioId: comparison.meta.baseScenarioId,
      compareScenarioId: comparison.meta.compareScenarioId,
      baseName: comparison.meta.baseName,
      compareName: comparison.meta.compareName,
    },
    drivers,
    byCategory,
    impactGraph: buildImpactGraph(drivers),
    tradeoffs: buildTradeoffs(drivers),
    riskIndicators: buildRiskIndicators(comparison),
    narrative: {
      headline: "",
      whatChanged: "",
      whyChanged: "",
      bullets: [],
      tradeoffBullets: [],
    },
    residual: {
      revenue: totalDelta.revenue - sumRev,
      netProfit: totalDelta.netProfit - sumNp,
      grossProfit: totalDelta.grossProfit - drivers.reduce((s, d) => s + d.contributions.grossProfit.absolute, 0),
    },
    serviceMixDisclaimer: true,
  };

  if (labels) {
    result.narrative = buildAttributionNarrative(result, comparison, labels);
  }

  return result;
}
