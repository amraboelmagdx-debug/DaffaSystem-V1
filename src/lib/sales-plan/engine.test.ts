import { describe, expect, it } from "vitest";
import { requiredAwardsFromRevenue, weightedPortfolioAdv } from "./engine";

describe("requiredAwardsFromRevenue", () => {
  it("floors to one deal at ADV when target revenue is below ADV", () => {
    const r = requiredAwardsFromRevenue(2_500_000, 3_000_000);
    expect(r.requiredCount).toBe(1);
    expect(r.flooredToMinDeal).toBe(true);
    expect(r.effectiveRevenueSar).toBe(3_000_000);
  });

  it("ceil division when target exceeds ADV", () => {
    const r = requiredAwardsFromRevenue(7_000_000, 3_000_000);
    expect(r.requiredCount).toBe(3);
    expect(r.flooredToMinDeal).toBe(false);
  });
});

describe("weightedPortfolioAdv", () => {
  it("weights by service share and tier mix", () => {
    const adv = weightedPortfolioAdv({
      serviceWeights: [
        { serviceId: "a", weight: 0.5 },
        { serviceId: "b", weight: 0.5 },
      ],
      cells: [
        { serviceId: "a", exists: true, adv: 1_000_000, mix: 1 },
        { serviceId: "b", exists: true, adv: 3_000_000, mix: 1 },
      ],
    });
    expect(adv).toBe(2_000_000);
  });
});
