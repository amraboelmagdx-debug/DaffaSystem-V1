import { describe, expect, it, vi, afterEach } from "vitest";
import { demoCompanies } from "@/data/demo-seed";
import { buildDemoForecastSeries } from "@/data/demo-seed";
import { buildRollingForecastSeries } from "./rolling-forecast-series";

describe("buildRollingForecastSeries", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 12 months with revenue/GP/NP derived from company targets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T12:00:00.000Z"));

    const company = demoCompanies.find((c) => c.id === "co-northwind")!;
    const series = buildRollingForecastSeries(company);

    expect(series).toHaveLength(12);
    expect(series[0]!.month).toMatch(/^\d{4}-\d{2}$/);
    expect(series[0]!.revenue).toBe(company.revenueMonthly);
    expect(series[0]!.grossProfit).toBeCloseTo(
      company.revenueMonthly * company.contributionMarginPct
    );
    expect(series[0]!.netProfit).toBeCloseTo(
      series[0]!.grossProfit - company.fixedCostsMonthly
    );

    if (company.growthTargetPct > 0) {
      expect(series[11]!.revenue).toBeGreaterThan(series[0]!.revenue);
    }
  });

  it("matches demo-seed re-export byte-for-byte for Northwind", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T12:00:00.000Z"));

    const company = demoCompanies.find((c) => c.id === "co-northwind")!;
    const fromLib = buildRollingForecastSeries(company);
    const fromSeed = buildDemoForecastSeries(company);

    expect(fromLib).toEqual(fromSeed);
  });
});
