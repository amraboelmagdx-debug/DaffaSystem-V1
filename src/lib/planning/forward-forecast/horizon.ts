import type { ForecastHorizon, ForecastHorizonMonths } from "@/types/forward-forecast";

export function monthLabelFromOffset(startMonth: string, offset: number): string {
  const [y, m] = startMonth.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + offset, 1);
  return d.toISOString().slice(0, 7);
}

export function defaultForecastHorizon(months: ForecastHorizonMonths = 12): ForecastHorizon {
  const d = new Date();
  return {
    months,
    startMonth: d.toISOString().slice(0, 7),
  };
}

export function periodLabels(horizon: ForecastHorizon): string[] {
  return Array.from({ length: horizon.months }, (_, i) =>
    monthLabelFromOffset(horizon.startMonth, i)
  );
}
