import { describe, expect, it } from "vitest";
import { demoCompanies, demoOpportunities, demoScenarios, demoStreams } from "@/data/demo-seed";
import { migrateLegacyWorkspaceToBundles } from "@/lib/planning/scenario";
import { compareScenarios } from "@/lib/planning/scenario-comparison";
import { compareOperationalFeasibility } from "./compare-operational-feasibility";
import { buildFeasibilityEvalContext } from "./build-feasibility-context";
import { evaluateOperationalFeasibility } from "./evaluate-operational-feasibility";
import { buildTestHrSnapshot, testHrBusinessUnitId } from "./test-hr-fixture";
import type { OperationalFeasibilityNarrativeLabels } from "@/types/operational-feasibility";

const stubLabels: OperationalFeasibilityNarrativeLabels = {
  headlineFeasible: (s) => `${s} feasible`,
  headlineConstrained: (s, p) => `${s} constrained ${p}`,
  headlineInfeasible: (s, p) => `${s} infeasible ${p}`,
  roleOverload: (s, r, p) => `${s} overload ${r} ${p}`,
  serviceBottleneck: (svc) => `bottleneck ${svc}`,
  hiringPressure: (fte) => `hire ${fte}`,
  thresholdBreach: (c) => `roles ${c}`,
  unavailable: (r) => `unavailable ${r}`,
  compareStatusShift: (f, t) => `${f} → ${t}`,
  disclaimer: "disclaimer",
  statusLabel: {
    feasible: "Feasible",
    constrained: "Constrained",
    infeasible: "Infeasible",
    unavailable: "Unavailable",
  },
  hiringLevel: { low: "low", moderate: "mod", high: "high", severe: "severe" },
  riskLabels: {},
};

describe("operational-feasibility", () => {
  const companyBase = demoCompanies.find((c) => c.id === "co-northwind")!;
  const streams = demoStreams.filter((s) => s.companyId === companyBase.id);
  const opportunities = demoOpportunities.filter((o) => o.companyId === companyBase.id);
  const bundles = migrateLegacyWorkspaceToBundles({
    companies: [companyBase],
    scenarios: demoScenarios.filter((s) => s.companyId === companyBase.id),
    tierLineOverrides: {},
    selectedScenarioId: "sc-base",
  });

  const hrSnapshot = buildTestHrSnapshot();
  const buId = testHrBusinessUnitId(hrSnapshot);
  const company = { ...companyBase, hrBusinessUnitId: buId };

  it("aggressive scenario has higher demand utilization than baseline", () => {
    const baseCtx = buildFeasibilityEvalContext({
      anchorCompany: company,
      streams,
      opportunities,
      bundle: bundles["sc-base"]!,
      hrSnapshot,
    });
    const aggrCtx = buildFeasibilityEvalContext({
      anchorCompany: company,
      streams,
      opportunities,
      bundle: bundles["sc-aggr"]!,
      baselineBundle: bundles["sc-base"]!,
      hrSnapshot,
    });

    const base = evaluateOperationalFeasibility(baseCtx);
    const aggr = evaluateOperationalFeasibility(aggrCtx);

    expect(base.feasibilityMode).toBe("hr_backed");
    expect(aggr.feasibilityMode).toBe("hr_backed");
    expect(aggr.demand!.totalDemandHoursMonth).toBeGreaterThan(
      base.demand!.totalDemandHoursMonth
    );
    expect(aggr.saturation!.buUtilizationPct).toBeGreaterThan(
      base.saturation!.buUtilizationPct
    );
  });

  it("compare mode marks HR-backed and suppresses proxy when linked", () => {
    const comparison = compareScenarios({
      anchorCompany: company,
      streams,
      opportunities,
      bundlesById: bundles,
      baseScenarioId: "sc-base",
      compareScenarioId: "sc-aggr",
    });

    const result = compareOperationalFeasibility(
      {
        comparison,
        context: {
          anchorCompany: company,
          streams,
          opportunities,
          bundlesById: bundles,
          baseScenarioId: "sc-base",
          compareScenarioId: "sc-aggr",
        },
        hrSnapshot,
      },
      stubLabels
    );

    expect(result.feasibilityMode).toBe("hr_backed");
    expect(result.suppressCapacityProxyNarrative).toBe(true);
    expect(result.compare.supply!.totalBillableHoursMonth).toBeGreaterThan(0);
  });

  it("returns unavailable without HR business unit link", () => {
    const orphan = { ...companyBase, hrBusinessUnitId: undefined };
    const ctx = buildFeasibilityEvalContext({
      anchorCompany: orphan,
      streams,
      opportunities,
      bundle: bundles["sc-base"]!,
      hrSnapshot,
    });
    const result = evaluateOperationalFeasibility(ctx);
    expect(result.status).toBe("unavailable");
    expect(result.feasibilityMode).toBe("unavailable");
  });
});
