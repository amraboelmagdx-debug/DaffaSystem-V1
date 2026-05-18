import type { DemoForecastMonth } from "@/types/domain";
import type { EngineOutputs } from "@/lib/calculations/engine";

export type ForecastGridRow = {
  month: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
};

export function forecastGridRowFromEngine(
  month: string,
  engine: Pick<EngineOutputs, "revenue" | "grossProfit" | "netProfit">
): ForecastGridRow {
  return {
    month,
    revenue: engine.revenue,
    grossProfit: engine.grossProfit,
    netProfit: engine.netProfit,
  };
}

export function forecastGridRowsFromSeries(series: DemoForecastMonth[]): ForecastGridRow[] {
  return series.map((r) =>
    forecastGridRowFromEngine(r.month, {
      revenue: r.revenue,
      grossProfit: r.grossProfit,
      netProfit: r.netProfit,
    })
  );
}
