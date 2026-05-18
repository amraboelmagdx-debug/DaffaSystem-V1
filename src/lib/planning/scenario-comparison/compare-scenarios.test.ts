import { describe, expect, it } from "vitest";
import { demoCompanies, demoOpportunities, demoScenarios, demoStreams } from "@/data/demo-seed";
import { migrateLegacyWorkspaceToBundles } from "@/lib/planning/scenario";
import { compareScenarios } from "./compare-scenarios";

const labels = {
  revenueUp: (pct, c, b) => `${c} revenue ${pct} vs ${b}`,
  revenueDown: (pct, c, b) => `${c} revenue ${pct} vs ${b}`,
  netProfitUp: (pct) => `NP ${pct}`,
  netProfitDown: (pct) => `NP ${pct}`,
  postureShift: (f, from, to) => `${f}: ${from} → ${to}`,
  governanceTypeChange: (from, to) => `type ${from} → ${to}`,
  salesGapWiden: (a) => `gap +${a}`,
  salesGapNarrow: (a) => `gap −${a}`,
  sharedStreams: "shared streams",
  capacityProxy: (from, to) => `capacity ${from} → ${to}`,
  defaultHeadline: (c, b) => `${c} vs ${b}`,
  postureLabels: {
    growthPosture: "Growth",
    utilizationPosture: "Utilization",
    hiringPosture: "Hiring",
    pricingPosture: "Pricing",
    costPosture: "Cost",
  },
  postureLevel: { low: "low", neutral: "neutral", high: "high" },
};

describe("compareScenarios", () => {
  const company = demoCompanies.find((c) => c.id === "co-northwind")!;
  const streams = demoStreams.filter((s) => s.companyId === company.id);
  const opportunities = demoOpportunities.filter((o) => o.companyId === company.id);
  const bundles = migrateLegacyWorkspaceToBundles({
    companies: [company],
    scenarios: demoScenarios.filter((s) => s.companyId === company.id),
    tierLineOverrides: {},
    selectedScenarioId: "sc-base",
  });

  it("baseline vs aggressive has revenue delta aligned with engine", () => {
    const result = compareScenarios(
      {
        anchorCompany: company,
        streams,
        opportunities,
        bundlesById: bundles,
        baseScenarioId: "sc-base",
        compareScenarioId: "sc-aggr",
      },
      labels
    );
    expect(result.financial.revenue.absolute).toBe(
      result.compare.engine.revenue - result.base.engine.revenue
    );
    expect(result.narrative.headline.length).toBeGreaterThan(0);
    expect(result.capacityPressure.isProxy).toBe(true);
  });

  it("throws when bundle missing", () => {
    expect(() =>
      compareScenarios({
        anchorCompany: company,
        streams,
        opportunities,
        bundlesById: bundles,
        baseScenarioId: "missing",
        compareScenarioId: "sc-aggr",
      })
    ).toThrow();
  });
});
