import { describe, expect, it } from "vitest";
import { computeCommercialMargins, buildMarginWarnings } from "./margin-analytics";
import type { OperationalPricingBasis } from "./types";
import { DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS } from "./defaults";

const basis: OperationalPricingBasis = {
  businessUnitId: "bu",
  serviceTemplateId: "t",
  serviceTierId: "tier",
  templateCode: "T",
  tierCode: "S",
  templateName: "T",
  tierName: "S",
  currency: "SAR",
  totalDirectCost: 10_000,
  totalLoadedCost: 14_000,
  totalOhContribution: 4_000,
  totalEffectiveHours: 100,
};

describe("computeCommercialMargins", () => {
  it("computes gross above contribution when loaded > direct", () => {
    const m = computeCommercialMargins(basis, 20_000);
    expect(m.grossMarginPct).toBeGreaterThan(m.contributionMarginPct);
    expect(m.loadedCostRatio).toBeCloseTo(0.7, 6);
  });
});

describe("buildMarginWarnings", () => {
  it("warns when contribution is below safety floor", () => {
    const margins = computeCommercialMargins(basis, 14_500);
    const w = buildMarginWarnings(margins, DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS);
    expect(w.length).toBeGreaterThan(0);
  });
});
