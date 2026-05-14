import { describe, expect, it } from "vitest";
import { demoCompanies, demoStreams } from "@/data/demo-seed";
import { resolveTierLines } from "@/data/default-tier-lines";
import { computeWorkbookTargets, pickBlendedMargin } from "@/lib/planning/workbook-engine";
import { computeWorkbookPlanningSlice } from "./workbook-planning-slice";

describe("computeWorkbookPlanningSlice parity", () => {
  const company = demoCompanies.find((c) => c.id === "co-northwind")!;
  const streams = demoStreams.filter((s) => s.companyId === company.id);
  const tierLineOverrides = {};

  it("matches direct workbook-engine composition", () => {
    const slice = computeWorkbookPlanningSlice({
      streams,
      tierLineOverrides,
      fixedCostsMonthly: company.fixedCostsMonthly,
      npTargetPct: company.npTargetPct,
    });

    const groups = streams.map((s) => ({
      revenueStreamId: s.id,
      lines: resolveTierLines(tierLineOverrides, s.id),
    }));
    const blended = pickBlendedMargin(groups);
    const targets = computeWorkbookTargets({
      fixedCosts: company.fixedCostsMonthly,
      npTargetPct: company.npTargetPct,
      blendedContributionMargin: blended,
    });

    expect(slice.blendedWorkbook).toBeCloseTo(blended, 10);
    expect(slice.workbookTargets.salesTarget).toBeCloseTo(targets.salesTarget, 6);
    expect(slice.workbookTargets.netProfitAtTarget).toBeCloseTo(targets.netProfitAtTarget, 4);
    expect(slice.workbookTargets.roi).toBeCloseTo(targets.roi, 6);
  });
});
