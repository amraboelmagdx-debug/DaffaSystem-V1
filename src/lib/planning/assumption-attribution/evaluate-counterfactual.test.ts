import { describe, expect, it } from "vitest";
import { demoCompanies, demoOpportunities, demoScenarios, demoStreams } from "@/data/demo-seed";
import { migrateLegacyWorkspaceToBundles } from "@/lib/planning/scenario";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import { evaluateScenarioBundle } from "@/lib/planning/scenario-comparison";
import { DRIVER_SPECS } from "./assumption-keys";
import {
  evaluateDriverCounterfactual,
  marginalFromSnapshots,
  snapshotMeasures,
} from "./evaluate-counterfactual";

describe("evaluate-counterfactual", () => {
  const company = demoCompanies.find((c) => c.id === "co-northwind")!;
  const streams = demoStreams.filter((s) => s.companyId === company.id);
  const opportunities = demoOpportunities.filter((o) => o.companyId === company.id);
  const bundles = migrateLegacyWorkspaceToBundles({
    companies: [company],
    scenarios: demoScenarios.filter((s) => s.companyId === company.id),
    tierLineOverrides: {},
    selectedScenarioId: "sc-base",
  });

  const ctx = { anchorCompany: company, streams, opportunities };
  const baseBundle = mergeGovernanceOnHydrate(bundles["sc-base"]!);
  const compareBundle = mergeGovernanceOnHydrate(bundles["sc-aggr"]!);
  const baseEval = evaluateScenarioBundle({ ...ctx, bundle: baseBundle });

  it("growth lever counterfactual increases revenue vs base", () => {
    const growthSpec = DRIVER_SPECS.find((d) => d.id === "lever.growthAdj")!;
    expect(growthSpec.changed(baseBundle, compareBundle)).toBe(true);

    const cf = evaluateDriverCounterfactual(
      ctx,
      baseBundle,
      compareBundle,
      growthSpec
    );
    const marginal = marginalFromSnapshots(snapshotMeasures(baseEval), snapshotMeasures(cf));
    expect(marginal.revenue).toBeGreaterThan(0);
  });

  it("unchanged overlay driver is not in changed list", () => {
    const same = { ...compareBundle, companyOverlay: { ...baseBundle.companyOverlay } };
    const revenueSpec = DRIVER_SPECS.find((d) => d.id === "overlay.revenueMonthly")!;
    expect(revenueSpec.changed(baseBundle, same)).toBe(false);
  });
});
