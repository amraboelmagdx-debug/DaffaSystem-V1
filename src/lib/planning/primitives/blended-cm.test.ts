import { describe, expect, it } from "vitest";
import { contributionFromStreams } from "@/lib/calculations/engine";
import { blendedCmFromStreams } from "./blended-cm";
import type { DemoRevenueStream } from "@/types/domain";

function stream(
  partial: Pick<DemoRevenueStream, "revenueWeight" | "contributionMarginPct">
): DemoRevenueStream {
  return {
    id: "s1",
    companyId: "c1",
    name: "Stream",
    hrDepartmentId: null,
    serviceTemplateId: null,
    serviceFamilyId: null,
    avgDealSize: 0,
    growthRatePct: 0,
    conversionRatePct: 0,
    salesCycleDays: 60,
    ...partial,
  };
}

describe("blendedCmFromStreams", () => {
  it("matches contributionFromStreams for weighted streams", () => {
    const streams = [
      stream({ revenueWeight: 0.6, contributionMarginPct: 0.4 }),
      stream({ revenueWeight: 0.4, contributionMarginPct: 0.5 }),
    ];
    const expected = contributionFromStreams(
      streams.map((s) => ({
        revenueWeight: s.revenueWeight,
        contributionMarginPct: s.contributionMarginPct,
      }))
    );
    expect(blendedCmFromStreams(streams, 0.38)).toBeCloseTo(expected, 8);
  });

  it("returns fallback when no streams", () => {
    expect(blendedCmFromStreams([], 0.42)).toBe(0.42);
  });
});
