import { describe, expect, it } from "vitest";
import { demoCompanies, demoOpportunities, demoScenarios, demoStreams } from "@/data/demo-seed";
import { migrateLegacyWorkspaceToBundles } from "@/lib/planning/scenario";
import { compareScenarios } from "@/lib/planning/scenario-comparison";
import { attributeScenarioComparison } from "./attribute-scenario-comparison";
import type { AttributionNarrativeLabels } from "@/types/scenario-attribution";

const stubLabels: AttributionNarrativeLabels = {
  revenueHeadline: (d, p) => `Revenue driven by ${d} (${p})`,
  marginHeadline: (d) => `Margin pressure from ${d}`,
  riskHeadline: (r) => `Risk: ${r}`,
  tradeoff: (g, c) => `${g} vs ${c}`,
  whatChanged: (n) => `${n} drivers changed`,
  whyChanged: (p) => `Primary: ${p}`,
  residualNote: (r, n) => `Residual rev ${r}, NP ${n}`,
  postureShift: (f, from, to) => `${f}: ${from} → ${to}`,
  serviceMix: "shared streams",
  driverLabel: {
    "overlay.revenueMonthly": "Revenue monthly",
    "overlay.npTargetPct": "NP target overlay",
    "overlay.fixedCostsMonthly": "Fixed costs",
    "overlay.growthTargetPct": "Growth target",
    "overlay.marginTargetPct": "Margin target",
    "overlay.contributionMarginPct": "CM overlay",
    "lever.growthAdj": "Growth lever",
    "lever.conversionRateAdj": "Conversion",
    "lever.revenueMixAdj": "Revenue mix",
    "lever.fixedCostAdj": "Fixed cost lever",
    "lever.pipelineWeightAdj": "Pipeline weight",
    "lever.npTargetPct": "NP target lever",
    "workbook.tierOverrides": "Tier overrides",
    "governance.riskPosture": "Risk posture",
    "governance.utilizationPosture": "Utilization posture",
  },
  categoryLabel: {
    growth: "Growth",
    pricing: "Pricing",
    utilization: "Utilization",
    staffing: "Staffing",
    margin: "Margin",
    cost: "Cost",
    risk: "Risk",
    service_mix: "Service mix",
    fixed_cost: "Fixed cost",
    pipeline: "Pipeline",
    workbook: "Workbook",
    governance: "Governance",
  },
  pressureLabels: {
    riskLevelShift: "Risk level",
    utilizationPressure: "Utilization",
    salesGapWiden: "Sales gap",
    capacityProxy: "Capacity",
  },
  postureLabels: {
    growthPosture: "Growth",
    utilizationPosture: "Utilization",
    hiringPosture: "Hiring",
    pricingPosture: "Pricing",
    costPosture: "Cost",
  },
  postureLevel: { low: "low", neutral: "neutral", high: "high" },
};

describe("attributeScenarioComparison", () => {
  const company = demoCompanies.find((c) => c.id === "co-northwind")!;
  const streams = demoStreams.filter((s) => s.companyId === company.id);
  const opportunities = demoOpportunities.filter((o) => o.companyId === company.id);
  const bundles = migrateLegacyWorkspaceToBundles({
    companies: [company],
    scenarios: demoScenarios.filter((s) => s.companyId === company.id),
    tierLineOverrides: {},
    selectedScenarioId: "sc-base",
  });

  const context = {
    anchorCompany: company,
    streams,
    opportunities,
    bundlesById: bundles,
    baseScenarioId: "sc-base",
    compareScenarioId: "sc-aggr",
  };

  it("ranks growth and mix levers high for baseline vs aggressive", () => {
    const comparison = compareScenarios(context);
    const attribution = attributeScenarioComparison({ comparison, context }, stubLabels);

    expect(attribution.drivers.length).toBeGreaterThan(0);
    const topIds = attribution.drivers.slice(0, 3).map((d) => d.id);
    expect(topIds.some((id) => id === "lever.growthAdj" || id === "lever.revenueMixAdj")).toBe(
      true
    );

    const totalNp = comparison.financial.netProfit.absolute;
    const sumNp = attribution.drivers.reduce(
      (s, d) => s + d.contributions.netProfit.absolute,
      0
    );
    expect(Math.abs(totalNp - sumNp - attribution.residual.netProfit)).toBeLessThan(
      Math.max(500, Math.abs(totalNp) * 0.15)
    );
  });

  it("assigns primary role to top drivers", () => {
    const comparison = compareScenarios(context);
    const attribution = attributeScenarioComparison({ comparison, context });
    const primaries = attribution.drivers.filter((d) => d.role === "primary");
    expect(primaries.length).toBeLessThanOrEqual(2);
    expect(attribution.impactGraph.length).toBeGreaterThan(0);
    expect(attribution.serviceMixDisclaimer).toBe(true);
  });
});
