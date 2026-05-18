import { describe, expect, it } from "vitest";
import { demoCompanies, demoScenarios } from "@/data/demo-seed";
import { duplicateBundle, migrateLegacyWorkspaceToBundles } from "./scenario-bundle";
import { resolveEffectiveCompany } from "./resolve-effective-planning";

describe("resolveEffectiveCompany", () => {
  const company = demoCompanies.find((c) => c.id === "co-northwind")!;
  const baseline = demoScenarios.find((s) => s.id === "sc-base")!;

  it("duplicate does not mutate source bundle overlay", () => {
    const bundles = migrateLegacyWorkspaceToBundles({
      companies: demoCompanies,
      scenarios: demoScenarios.filter((s) => s.companyId === company.id),
      tierLineOverrides: {},
      selectedScenarioId: baseline.id,
    });
    const source = bundles[baseline.id]!;
    const dup = duplicateBundle(source, "Copy");
    dup.companyOverlay.npTargetPct = 0.99;

    expect(source.companyOverlay.npTargetPct).not.toBe(0.99);
    expect(dup.parentScenarioId).toBe(baseline.id);
  });

  it("switching bundle changes effective NP target", () => {
    const bundles = migrateLegacyWorkspaceToBundles({
      companies: [company],
      scenarios: demoScenarios.filter((s) => s.companyId === company.id),
      tierLineOverrides: {},
      selectedScenarioId: baseline.id,
    });
    bundles["sc-aggr"]!.companyOverlay.npTargetPct = 0.44;
    const effective = resolveEffectiveCompany(company, bundles["sc-aggr"]!);
    expect(effective.npTargetPct).toBe(0.44);
    expect(effective.npTargetPct).not.toBe(bundles[baseline.id]!.companyOverlay.npTargetPct);
  });
});
