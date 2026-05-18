"use client";

import { useMemo } from "react";
import { buildRollingForecastSeries } from "@/lib/planning/forecast/rolling-forecast-series";
import type { DemoCompany, DemoForecastMonth } from "@/types/domain";

export function useRollingForecastSeries(
  company: DemoCompany | null | undefined
): DemoForecastMonth[] {
  return useMemo(
    () => (company ? buildRollingForecastSeries(company) : []),
    [company]
  );
}
