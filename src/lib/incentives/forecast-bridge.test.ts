import { describe, expect, it } from "vitest";
import { dealsFromForwardForecast } from "./forecast-bridge";
import type { ForwardForecastResult } from "@/types/forward-forecast";

const minimalForecast: ForwardForecastResult = {
  meta: {
    companyId: "c1",
    scenarioId: "s1",
    scenarioName: "Base",
    horizon: { months: 12, startMonth: "2026-01" },
    buContext: null,
  },
  financial: {
    points: [
      {
        period: "2026-01",
        monthIndex: 0,
        revenue: 1_000_000,
        grossProfit: 350_000,
        netProfit: 100_000,
        npPct: 0.1,
        contributionMarginPct: 0.35,
      },
    ],
    confidenceBands: [],
    marginTrendPct: 0,
  },
  operational: { mode: "unavailable", points: [], firstSaturationMonth: null, recommendedHireFtePerMonth: null },
  targets: {
    workbookSalesTarget: 10_000_000,
    finalProjectedRevenue: 12_000_000,
    attainmentPct: 120,
    monthsToTarget: null,
  },
  narrative: { headline: "", bullets: [], sustainabilityIndicators: [] },
};

describe("dealsFromForwardForecast", () => {
  it("maps financial points to deal inputs", () => {
    const deals = dealsFromForwardForecast(minimalForecast, null);
    expect(deals).toHaveLength(1);
    expect(deals[0].dealValueSar).toBe(1_000_000);
    expect(deals[0].accrualMonth).toBe("2026-01");
  });
});
