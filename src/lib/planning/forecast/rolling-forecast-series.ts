import { projectLegacyCompanyForecastSeries } from "@/lib/planning/forward-forecast/legacy-company-series";
import type { DemoCompany, DemoForecastMonth } from "@/types/domain";

/**
 * @deprecated Prefer `evaluateForwardForecast` via `useForwardForecast`.
 * Grid sandbox reset still uses company-only roll-forward (no scenario levers).
 */
export function buildRollingForecastSeries(company: DemoCompany): DemoForecastMonth[] {
  return projectLegacyCompanyForecastSeries(company);
}

/** @deprecated Use {@link buildRollingForecastSeries} — kept for demo-seed callers. */
export const buildDemoForecastSeries = buildRollingForecastSeries;
