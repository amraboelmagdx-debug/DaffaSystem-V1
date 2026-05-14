import { describe, expect, it } from "vitest";
import { runCommercialPricingIntelligence } from "./engine";
import type { OperationalPricingBasis } from "./types";
import { getCommercialPricingScenarioById } from "./commercial-pricing-scenarios";
import { DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS } from "./defaults";

const basis: OperationalPricingBasis = {
  businessUnitId: "bu-1",
  serviceTemplateId: "t1",
  serviceTierId: "tier-1",
  templateCode: "TPL",
  tierCode: "STD",
  templateName: "Test",
  tierName: "Standard",
  currency: "SAR",
  totalDirectCost: 40_000,
  totalLoadedCost: 58_000,
  totalOhContribution: 18_000,
  totalEffectiveHours: 400,
};

describe("runCommercialPricingIntelligence", () => {
  it("computes cost-plus price and margins", () => {
    const r = runCommercialPricingIntelligence({
      basis,
      model: { modelId: "cost_plus", markupPct: 25 },
      activeRiskIds: [],
      scenario: getCommercialPricingScenarioById("neutral"),
      thresholds: DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.suggestedCommercialPrice).toBeCloseTo(58_000 * 1.25, 6);
    expect(r.margins.contributionMarginPct).toBeGreaterThan(0);
    expect(r.margins.grossMarginPct).toBeGreaterThan(r.margins.contributionMarginPct);
  });

  it("stacks commercial risks and scenario multipliers", () => {
    const r = runCommercialPricingIntelligence({
      basis,
      model: { modelId: "cost_plus", markupPct: 20 },
      activeRiskIds: ["difficult_client", "high_revision_risk"],
      scenario: getCommercialPricingScenarioById("profitability_focus"),
      thresholds: DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const anchor = 58_000 * 1.2;
    const risk = 1.08 * 1.12;
    const scen = 1.15;
    expect(r.suggestedCommercialPrice).toBeCloseTo(anchor * risk * scen, 4);
  });

  it("flags unresolved risk ids without failing", () => {
    const r = runCommercialPricingIntelligence({
      basis,
      model: { modelId: "value_based", valueMultiplier: 1.3 },
      activeRiskIds: ["difficult_client", "unknown_risk"],
      scenario: getCommercialPricingScenarioById("neutral"),
      thresholds: DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.unresolvedRiskIds).toContain("unknown_risk");
  });

  it("rejects invalid basis", () => {
    const r = runCommercialPricingIntelligence({
      basis: { ...basis, totalLoadedCost: NaN },
      model: { modelId: "cost_plus", markupPct: 10 },
      activeRiskIds: [],
      scenario: getCommercialPricingScenarioById("neutral"),
      thresholds: DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS,
    });
    expect(r.ok).toBe(false);
  });
});
