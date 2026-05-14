import { describe, expect, it } from "vitest";
import { buildCommercialPricingPresetImportPreview } from "./import-pricing-presets";

describe("buildCommercialPricingPresetImportPreview", () => {
  it("parses a valid row", () => {
    const r = buildCommercialPricingPresetImportPreview({
      pricingModelId: "cost_plus",
      modelParamsJson: JSON.stringify({ markupPct: 42 }),
      riskIdsCsv: "difficult_client; unstable_scope",
      commercialScenarioId: "aggressive_market",
      minGrossMarginPct: "30",
    });
    expect(r.valid).toBe(true);
    expect(r.bundle?.model).toEqual({ modelId: "cost_plus", markupPct: 42 });
    expect(r.bundle?.riskIds).toEqual(["difficult_client", "unstable_scope"]);
  });

  it("rejects unknown model id", () => {
    const r = buildCommercialPricingPresetImportPreview({
      pricingModelId: "magic_pricing",
      commercialScenarioId: "neutral",
    });
    expect(r.valid).toBe(false);
  });
});
