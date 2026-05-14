import { describe, expect, it } from "vitest";
import type { ContributionCell } from "@/types/sales-plan";
import { buildSalesPlanModel } from "./build-model";

const baseProducts = [
  {
    id: "s1",
    name: "Service A",
    category: "c",
    deliveryType: "service" as const,
    strategicImportance: 0.5,
    operationalComplexity: 3,
    scalabilityScore: 0.5,
  },
];

const baseCells: Record<string, ContributionCell> = {
  "s1:tiny": {
    serviceId: "s1",
    tierKey: "tiny",
    exists: true,
    avgDealValueSar: 400_000,
    contributionMarginPct: 0.4,
    deliveryCostSar: 5000,
    salesCycleDays: 30,
  },
  "s1:standard": {
    serviceId: "s1",
    tierKey: "standard",
    exists: true,
    avgDealValueSar: 1_000_000,
    contributionMarginPct: 0.42,
    deliveryCostSar: 8000,
    salesCycleDays: 45,
  },
  "s1:big": {
    serviceId: "s1",
    tierKey: "big",
    exists: true,
    avgDealValueSar: 3_000_000,
    contributionMarginPct: 0.45,
    deliveryCostSar: 12_000,
    salesCycleDays: 60,
  },
  "s1:mega": {
    serviceId: "s1",
    tierKey: "mega",
    exists: false,
    avgDealValueSar: 8_000_000,
    contributionMarginPct: 0.5,
    deliveryCostSar: 20_000,
    salesCycleDays: 90,
  },
};

const defaultRates = {
  contactToLead: 0.12,
  leadToQualifiedOpp: 0.25,
  qualifiedOppToBidding: 0.4,
  biddingToAward: 0.18,
};

const defaultSeg = [
  { segment: "governmental" as const, targetPct: 0.25 },
  { segment: "private" as const, targetPct: 0.25 },
  { segment: "semi_governmental" as const, targetPct: 0.25 },
  { segment: "nonprofit" as const, targetPct: 0.25 },
];

describe("buildSalesPlanModel", () => {
  it("flags service share drift", () => {
    const m = buildSalesPlanModel({
      products: baseProducts,
      serviceRevenueShare: { s1: 0.7 },
      tierMixByService: { s1: { tiny: 0.34, standard: 0.33, big: 0.33 } },
      contributionCells: baseCells,
      fixedMonthly: 100_000,
      blendedCm: 0.42,
      npTargetPct: 0.1,
      conversionRates: defaultRates,
      quarterlyWeights: { q1: 0.25, q2: 0.25, q3: 0.25, q4: 0.25 },
      marketSegments: defaultSeg,
    });
    expect(m.insights.some((i) => i.id === "serviceShareDrift")).toBe(true);
  });

  it("allocates tier revenue that sums to annual target", () => {
    const m = buildSalesPlanModel({
      products: baseProducts,
      serviceRevenueShare: { s1: 1 },
      tierMixByService: { s1: { tiny: 0.34, standard: 0.33, big: 0.33 } },
      contributionCells: baseCells,
      fixedMonthly: 50_000,
      blendedCm: 0.45,
      npTargetPct: 0.1,
      conversionRates: defaultRates,
      quarterlyWeights: { q1: 0.25, q2: 0.25, q3: 0.25, q4: 0.25 },
      marketSegments: defaultSeg,
    });
    const sum = m.tierRollups.reduce((a, r) => a + r.revenueSar, 0);
    expect(sum).toBeCloseTo(m.annualRevenueSar, 4);
  });
});
