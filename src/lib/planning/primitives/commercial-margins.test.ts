import { describe, expect, it } from "vitest";
import { computeCommercialMargins } from "@/lib/commercial-pricing-intelligence/margin-analytics";
import { marginsFromPriceAndCostTotals } from "./commercial-margins";

describe("marginsFromPriceAndCostTotals", () => {
  it("matches computeCommercialMargins percent output", () => {
    const basis = {
      totalDirectCost: 40,
      totalLoadedCost: 55,
      totalOhContribution: 15,
      totalEffectiveHours: 10,
    };
    const price = 100;
    const expected = computeCommercialMargins(
      {
        businessUnitId: "",
        serviceTemplateId: "",
        serviceTierId: "",
        templateCode: "",
        tierCode: "",
        templateName: "",
        tierName: "",
        currency: "SAR",
        ...basis,
      },
      price
    );
    const actual = marginsFromPriceAndCostTotals({
      directCost: basis.totalDirectCost,
      loadedCost: basis.totalLoadedCost,
      ohContribution: basis.totalOhContribution,
      suggestedPrice: price,
    });
    expect(actual.grossMarginPct).toBeCloseTo(expected.grossMarginPct, 6);
    expect(actual.contributionMarginPct).toBeCloseTo(expected.contributionMarginPct, 6);
  });
});
