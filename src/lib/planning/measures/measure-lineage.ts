/**
 * Lightweight KPI lineage (Phase 2) — pairs with `MEASURE_CATALOG`.
 * Powers bulbs, drilldowns, and future audit logs without a second truth source.
 */

import type { MeasureId } from "./measure-ids";
import type { FormulaOwner } from "./planning-measure-types";

export type KpiLineage = {
  measureId: MeasureId;
  semanticMode: string;
  sourceEngine: FormulaOwner;
  upstreamMeasureIds: readonly MeasureId[];
  calculationPath: readonly string[];
};
