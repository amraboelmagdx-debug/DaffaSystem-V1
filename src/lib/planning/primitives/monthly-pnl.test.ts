import { describe, expect, it } from "vitest";
import { monthlyPnLFromCm, monthlyPnLFromRevenueEdit } from "./monthly-pnl";

describe("monthlyPnLFromCm", () => {
  it("derives gross and net from revenue and CM", () => {
    const row = monthlyPnLFromCm({
      fixedCostsMonthly: 50_000,
      contributionMarginPct: 0.4,
      targetNpPct: 0.1,
      revenueMonthly: 200_000,
    });
    expect(row.revenue).toBe(200_000);
    expect(row.grossProfit).toBeCloseTo(80_000, 2);
    expect(row.netProfit).toBeCloseTo(30_000, 2);
  });

  it("monthlyPnLFromRevenueEdit updates dependent fields", () => {
    const base = {
      fixedCostsMonthly: 50_000,
      contributionMarginPct: 0.4,
      targetNpPct: 0.1,
      revenueMonthly: 200_000,
    };
    const edited = monthlyPnLFromRevenueEdit(250_000, base);
    expect(edited.revenue).toBe(250_000);
    expect(edited.grossProfit).toBeCloseTo(100_000, 2);
    expect(edited.netProfit).toBeCloseTo(50_000, 2);
  });
});
