import { describe, expect, it } from "vitest";
import { demoCompanies, demoScenarios } from "@/data/demo-seed";
import { createBundleFromCompany, duplicateBundle } from "./scenario-bundle";
import {
  buildScenarioIntentLine,
  defaultGovernanceForScenario,
  deriveAssumptionsSummary,
  governanceForDuplicate,
  inferScenarioTypeFromName,
  isScenarioGovernanceEditable,
  mergeGovernanceOnHydrate,
} from "./scenario-governance";
import type { ScenarioIntentLabels } from "./scenario-governance";

const labels: ScenarioIntentLabels = {
  type: {
    baseline: "Baseline",
    break_even: "Break-even",
    conservative: "Conservative",
    aggressive: "Aggressive",
    expansion: "Expansion",
    stress_case: "Stress case",
    recovery_plan: "Recovery plan",
    hiring_freeze: "Hiring freeze",
    market_downturn: "Market downturn",
    strategic_push: "Strategic push",
    custom: "Custom",
  },
  status: {
    draft: "draft",
    active: "active",
    archived: "archived",
    locked: "locked",
    approved: "approved",
  },
  posture: { low: "lower", neutral: "neutral", high: "higher" },
  clonedFrom: (n) => `cloned from ${n}`,
  reference: "reference",
  targetingNp: (p) => `targeting ${p} NP`,
  viaPostures: (p) => `via ${p}`,
  customObjective: (t) => t,
};

describe("inferScenarioTypeFromName", () => {
  it("maps known name patterns", () => {
    expect(inferScenarioTypeFromName("Baseline 2026", true)).toBe("baseline");
    expect(inferScenarioTypeFromName("Aggressive push", false)).toBe("aggressive");
    expect(inferScenarioTypeFromName("Hiring freeze case", false)).toBe("hiring_freeze");
  });
});

describe("mergeGovernanceOnHydrate", () => {
  it("fills governance on legacy bundle shape", () => {
    const company = demoCompanies[0]!;
    const sc = demoScenarios.find((s) => s.companyId === company.id)!;
    const bundle = createBundleFromCompany(company, sc);
    const without = { ...bundle, governance: undefined as unknown as typeof bundle.governance };
    const merged = mergeGovernanceOnHydrate(without);
    expect(merged.governance.scenarioType).toBeTruthy();
    expect(merged.governance.assumptionsSummary.targetNpPct).toBeGreaterThan(0);
  });
});

describe("buildScenarioIntentLine", () => {
  it("mentions clone lineage", () => {
    const company = demoCompanies.find((c) => c.id === "co-northwind")!;
    const baseline = demoScenarios.find((s) => s.id === "sc-base")!;
    const baseBundle = mergeGovernanceOnHydrate(createBundleFromCompany(company, baseline));
    const dup = mergeGovernanceOnHydrate(
      duplicateBundle(baseBundle, "Aggressive clone")
    );
    dup.governance.scenarioType = "aggressive";
    dup.governance.status = "draft";
    const byId = { [baseline.id]: baseBundle, [dup.scenario.id]: dup };
    const line = buildScenarioIntentLine(dup, byId, labels);
    expect(line.toLowerCase()).toContain("aggressive");
    expect(line.toLowerCase()).toContain("baseline");
  });
});

describe("isScenarioGovernanceEditable", () => {
  it("blocks locked and archived", () => {
    const g = defaultGovernanceForScenario(demoScenarios[0]!);
    expect(isScenarioGovernanceEditable({ ...g, status: "draft" })).toBe(true);
    expect(isScenarioGovernanceEditable({ ...g, status: "locked" })).toBe(false);
    expect(isScenarioGovernanceEditable({ ...g, status: "archived" })).toBe(false);
  });
});

describe("governanceForDuplicate", () => {
  it("resets status and sets lineage", () => {
    const company = demoCompanies[0]!;
    const sc = demoScenarios[0]!;
    const source = mergeGovernanceOnHydrate(createBundleFromCompany(company, sc));
    source.governance.status = "approved";
    const gov = governanceForDuplicate(source, "new-id", "Copy");
    expect(gov.status).toBe("draft");
    expect(gov.clonedFromScenarioId).toBe(source.scenario.id);
  });
});

describe("deriveAssumptionsSummary", () => {
  it("reflects overlay np target", () => {
    const company = demoCompanies[0]!;
    const bundle = mergeGovernanceOnHydrate(
      createBundleFromCompany(company, {
        ...demoScenarios[0]!,
        npTargetPct: 0.2,
      })
    );
    bundle.companyOverlay.npTargetPct = 0.25;
    const summary = deriveAssumptionsSummary(bundle);
    expect(summary.targetNpPct).toBe(0.25);
  });
});
