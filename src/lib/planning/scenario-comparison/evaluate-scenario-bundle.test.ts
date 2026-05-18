import { describe, expect, it } from "vitest";
import { demoCompanies, demoOpportunities, demoScenarios, demoStreams } from "@/data/demo-seed";
import { createBundleFromCompany, deriveAssumptionsSummary, migrateLegacyWorkspaceToBundles } from "@/lib/planning/scenario";
import { evaluateScenarioBundle } from "./evaluate-scenario-bundle";

describe("evaluateScenarioBundle", () => {
  const company = demoCompanies.find((c) => c.id === "co-northwind")!;
  const streams = demoStreams.filter((s) => s.companyId === company.id);
  const opportunities = demoOpportunities.filter((o) => o.companyId === company.id);
  const bundles = migrateLegacyWorkspaceToBundles({
    companies: [company],
    scenarios: demoScenarios.filter((s) => s.companyId === company.id),
    tierLineOverrides: {},
    selectedScenarioId: "sc-base",
  });

  it("differs aggressive vs baseline revenue when overlay/levers differ", () => {
    const base = evaluateScenarioBundle({
      anchorCompany: company,
      streams,
      opportunities,
      bundle: bundles["sc-base"]!,
    });
    const aggr = evaluateScenarioBundle({
      anchorCompany: company,
      streams,
      opportunities,
      bundle: bundles["sc-aggr"]!,
    });
    expect(aggr.engine.revenue).not.toBe(base.engine.revenue);
  });

  it("reflects overlay np target in workbook slice", () => {
    const bundle = createBundleFromCompany(company, {
      ...demoScenarios[0]!,
      id: "sc-test",
      companyId: company.id,
    });
    bundle.companyOverlay.npTargetPct = 0.25;
    bundle.governance.assumptionsSummary = deriveAssumptionsSummary(bundle);
    const eval_ = evaluateScenarioBundle({
      anchorCompany: company,
      streams,
      opportunities,
      bundle,
    });
    expect(eval_.workbook.workbookTargets).toBeDefined();
    expect(eval_.governance.assumptionsSummary.targetNpPct).toBe(0.25);
  });
});
