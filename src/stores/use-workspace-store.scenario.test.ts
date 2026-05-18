import { beforeEach, describe, expect, it } from "vitest";
import { demoCompanies, demoScenarios } from "@/data/demo-seed";
import { migrateLegacyWorkspaceToBundles } from "@/lib/planning/scenario";
import { resolveEffectiveCompany } from "@/lib/planning/scenario/resolve-effective-planning";
import { useWorkspaceStore } from "./use-workspace-store";

describe("useWorkspaceStore scenarios", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().loadDemoPack();
  });

  it("createScenario isolates company overlay from source", () => {
    const company = demoCompanies.find((c) => c.id === "co-northwind")!;
    const baselineId = "sc-base";
    useWorkspaceStore.getState().setCompany(company.id);
    useWorkspaceStore.getState().setScenario(baselineId);
    useWorkspaceStore.getState().updateActiveScenarioOverlay({ npTargetPct: 0.2 });

    const cloneId = useWorkspaceStore.getState().createScenario({
      companyId: company.id,
      name: "Branch B",
      cloneFromId: baselineId,
    });
    expect(cloneId).toBeTruthy();

    useWorkspaceStore.getState().updateActiveScenarioOverlay({ npTargetPct: 0.5 });
    const baselineBundle = useWorkspaceStore.getState().scenarioBundles[baselineId]!;
    expect(baselineBundle.companyOverlay.npTargetPct).toBe(0.2);
  });

  it("applySalesPlanToScenario writes active non-baseline scenario", () => {
    const company = demoCompanies.find((c) => c.id === "co-northwind")!;
    const aggressiveId = "sc-aggr";
    useWorkspaceStore.setState((s) => ({
      companies: s.companies.map((c) =>
        c.id === company.id ? { ...c, hrBusinessUnitId: "bu-test" } : c
      ),
    }));
    useWorkspaceStore.getState().setCompany(company.id);
    useWorkspaceStore.getState().setScenario(aggressiveId);

    const ok = useWorkspaceStore.getState().applySalesPlanToScenario({
      scenarioId: aggressiveId,
      companyId: company.id,
      companyPatch: { npTargetPct: 0.33, fixedCostsMonthly: 99_000 },
      streams: useWorkspaceStore.getState().streams.filter((s) => s.companyId === company.id),
      scenarioPatch: { name: "Aggressive saved" },
    });
    expect(ok).toBe(true);

    const baseline = useWorkspaceStore.getState().scenarioBundles["sc-base"]!;
    expect(baseline.scenario.name).not.toBe("Aggressive saved");
    const aggr = useWorkspaceStore.getState().scenarioBundles[aggressiveId]!;
    expect(aggr.companyOverlay.npTargetPct).toBe(0.33);
    expect(aggr.scenario.name).toBe("Aggressive saved");
  });

  it("blocks structural edits when scenario is locked", () => {
    const company = demoCompanies.find((c) => c.id === "co-northwind")!;
    const aggressiveId = "sc-aggr";
    useWorkspaceStore.getState().setCompany(company.id);
    useWorkspaceStore.getState().setScenario(aggressiveId);
    const before = useWorkspaceStore.getState().scenarioBundles[aggressiveId]!.companyOverlay.npTargetPct;

    useWorkspaceStore.getState().setScenarioStatus(aggressiveId, "locked");
    useWorkspaceStore.getState().updateScenarioBundle(aggressiveId, {
      companyOverlay: { npTargetPct: 0.99 },
    });

    const after = useWorkspaceStore.getState().scenarioBundles[aggressiveId]!;
    expect(after.governance.status).toBe("locked");
    expect(after.companyOverlay.npTargetPct).toBe(before);
  });

  it("hydrates governance on legacy bundles", () => {
    const company = demoCompanies.find((c) => c.id === "co-northwind")!;
    const bundles = migrateLegacyWorkspaceToBundles({
      companies: [company],
      scenarios: demoScenarios.filter((s) => s.companyId === company.id),
      tierLineOverrides: {},
      selectedScenarioId: "sc-base",
    });
    expect(bundles["sc-base"]!.governance.scenarioType).toBe("baseline");
    expect(bundles["sc-aggr"]!.governance.assumptionsSummary.targetNpPct).toBeGreaterThan(0);
  });
});

describe("migrateLegacyWorkspaceToBundles", () => {
  it("effective company reflects per-scenario overlay after switch", () => {
    const company = demoCompanies.find((c) => c.id === "co-northwind")!;
    const bundles = migrateLegacyWorkspaceToBundles({
      companies: [company],
      scenarios: demoScenarios.filter((s) => s.companyId === company.id),
      tierLineOverrides: {},
      selectedScenarioId: "sc-base",
    });
    bundles["sc-aggr"]!.companyOverlay.npTargetPct = 0.44;
    const effective = resolveEffectiveCompany(company, bundles["sc-aggr"]!);
    expect(effective.npTargetPct).toBe(0.44);
  });
});
