/**
 * Locale-aware display helpers driven by `MEASURE_CATALOG.format`.
 */

import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";
import type { MeasureId } from "./measure-ids";
import { measureMetadataById } from "./measure-catalog";

export function formatPlanningMeasureValue(
  measureId: MeasureId,
  value: number,
  locale: string
): string {
  const meta = measureMetadataById(measureId);
  if (!meta) return String(value);

  switch (meta.format) {
    case "currency":
      return formatCurrencyLocale(value, locale);
    case "pct":
      return formatPct(value);
    case "integer":
      return Math.round(value).toLocaleString(locale);
    case "decimal":
    default:
      return value.toLocaleString(locale, { maximumFractionDigits: 3 });
  }
}
