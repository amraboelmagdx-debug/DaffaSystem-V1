import { describe, expect, it } from "vitest";
import { compareCanonicalOutputs } from "./compare-canonical-outputs";
import type { SalesPlanModel } from "@/lib/sales-plan/build-model";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";

describe("compareCanonicalOutputs", () => {
  it("reports no warning when NP targets align", () => {
    const report = compareCanonicalOutputs({
      salesPlanModel: null,
      executiveMeasures: {
        valuesByMeasureId: { [MEASURE_ID.NP_PCT_SCENARIO]: 0.12 },
      } as never,
      wizardNpTargetPct: 0.12,
      wizardBlendedCm: 0.4,
      incentiveSnapshot: null,
    });
    const np = report.items.find((i) => i.id === "np_target_pct");
    expect(np?.severity).toBe("ok");
  });

  it("flags drift when NP targets diverge", () => {
    const report = compareCanonicalOutputs({
      salesPlanModel: null,
      executiveMeasures: {
        valuesByMeasureId: { [MEASURE_ID.NP_PCT_SCENARIO]: 0.2 },
      } as never,
      wizardNpTargetPct: 0.1,
      wizardBlendedCm: null,
      incentiveSnapshot: null,
    });
    expect(report.severity).toBe("warning");
    expect(report.explanations.length).toBeGreaterThan(0);
    const np = report.items.find((i) => i.id === "np_target_pct");
    expect(np?.category).toBe("calculation_inconsistency");
    expect(np?.recommendedAction).toMatch(/Apply Sales Plan/i);
  });

  it("compares sales plan revenue to executive annualized", () => {
    const model = {
      annualRevenueSar: 12_000_000,
    } as Pick<SalesPlanModel, "annualRevenueSar"> as SalesPlanModel;
    const report = compareCanonicalOutputs({
      salesPlanModel: model,
      executiveMeasures: {
        valuesByMeasureId: { [MEASURE_ID.REVENUE_SCENARIO_MONTHLY]: 1_000_000 },
      } as never,
      wizardNpTargetPct: null,
      wizardBlendedCm: null,
      incentiveSnapshot: null,
    });
    const rev = report.items.find((i) => i.id === "projected_revenue");
    expect(rev?.severity).toBe("ok");
  });
});
