import type { MeasureId } from "@/lib/planning/measures/measure-ids";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";
import type { DealEconomicsMeasures } from "./types";

/** Maps `evaluateDealEconomics` rollup fields to canonical measure ids. */
export const DEAL_ECONOMICS_ROLLUP_MEASURE_MAP: Readonly<
  Record<keyof Pick<DealEconomicsMeasures, "directCost" | "loadedCost" | "suggestedPrice" | "totalQuantity">, MeasureId>
> = {
  directCost: MEASURE_ID.DEAL_DIRECT_COST,
  loadedCost: MEASURE_ID.DEAL_LOADED_COST,
  suggestedPrice: MEASURE_ID.DEAL_SUGGESTED_PRICE,
  totalQuantity: MEASURE_ID.DEAL_TOTAL_QUANTITY,
};

export function dealEconomicsRollupAsMeasureValues(
  rollup: DealEconomicsMeasures
): Partial<Record<MeasureId, number>> {
  const out: Partial<Record<MeasureId, number>> = {
    [MEASURE_ID.DEAL_DIRECT_COST]: rollup.directCost,
    [MEASURE_ID.DEAL_LOADED_COST]: rollup.loadedCost,
    [MEASURE_ID.DEAL_TOTAL_QUANTITY]: rollup.totalQuantity,
  };
  if (rollup.suggestedPrice != null) {
    out[MEASURE_ID.DEAL_SUGGESTED_PRICE] = rollup.suggestedPrice;
  }
  return out;
}
