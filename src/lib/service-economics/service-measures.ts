import type { MeasureId } from "@/lib/planning/measures/measure-ids";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";
import type { ServiceEconomicsMeasures } from "./types";

export function serviceEconomicsAsMeasureValues(
  measures: ServiceEconomicsMeasures
): Partial<Record<MeasureId, number>> {
  const out: Partial<Record<MeasureId, number>> = {
    [MEASURE_ID.SERVICE_ECONOMICS_DIRECT_COST]: measures.directCost,
    [MEASURE_ID.SERVICE_ECONOMICS_LOADED_COST]: measures.loadedCost,
  };
  if (measures.suggestedPrice != null) {
    out[MEASURE_ID.SERVICE_ECONOMICS_SUGGESTED_PRICE] = measures.suggestedPrice;
  }
  return out;
}
