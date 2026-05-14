/**
 * Explicit semantic modes → canonical `MEASURE_ID`.
 * Avoid ambiguous names like “Revenue” without period / basis.
 *
 * 💡 الاستخدام:
 * - في الواجهة أو التقارير: اعرض `MEASURE_SEMANTIC.WEIGHTED_PIPELINE_REVENUE` كنطاق معنى،
 *   ثم اربطه بـ `resolveSemanticToMeasureId(...)` للقيمة الرقمية من `valuesByMeasureId`.
 */

import { MEASURE_ID, type MeasureId } from "./measure-ids";

export const MEASURE_SEMANTIC = {
  ANNUAL_REVENUE_SAR: "annual_revenue_sar",
  MONTHLY_REVENUE_SCENARIO_ACTIVE: "monthly_revenue_scenario_active",
  MONTHLY_REVENUE_BASELINE_ENGINE: "monthly_revenue_baseline_engine",
  WEIGHTED_PIPELINE_REVENUE: "weighted_pipeline_revenue",
  EXPECTED_NP_PCT_SCENARIO: "expected_np_pct_scenario",
  PORTFOLIO_BLENDED_CM_WORKBOOK: "portfolio_blended_cm_workbook",
  STREAM_WEIGHTED_BLENDED_CM: "stream_weighted_blended_cm",
  WORKBOOK_ROI_ON_FIXED: "workbook_roi_on_fixed",
  SCENARIO_ROI_ON_FIXED: "scenario_roi_on_fixed",
} as const;

export type MeasureSemantic = (typeof MEASURE_SEMANTIC)[keyof typeof MEASURE_SEMANTIC];

const SEMANTIC_TO_MEASURE: Record<MeasureSemantic, MeasureId> = {
  [MEASURE_SEMANTIC.ANNUAL_REVENUE_SAR]: MEASURE_ID.SALES_PLAN_REVENUE_ANNUAL_SAR,
  [MEASURE_SEMANTIC.MONTHLY_REVENUE_SCENARIO_ACTIVE]: MEASURE_ID.REVENUE_SCENARIO_MONTHLY,
  [MEASURE_SEMANTIC.MONTHLY_REVENUE_BASELINE_ENGINE]: MEASURE_ID.REVENUE_BASELINE_MONTHLY,
  [MEASURE_SEMANTIC.WEIGHTED_PIPELINE_REVENUE]: MEASURE_ID.PIPELINE_WEIGHTED_VALUE,
  [MEASURE_SEMANTIC.EXPECTED_NP_PCT_SCENARIO]: MEASURE_ID.NP_PCT_SCENARIO,
  [MEASURE_SEMANTIC.PORTFOLIO_BLENDED_CM_WORKBOOK]: MEASURE_ID.CM_BLENDED_WORKBOOK,
  [MEASURE_SEMANTIC.STREAM_WEIGHTED_BLENDED_CM]: MEASURE_ID.CM_BLENDED_STREAMS,
  [MEASURE_SEMANTIC.WORKBOOK_ROI_ON_FIXED]: MEASURE_ID.WORKBOOK_ROI_ON_FIXED,
  [MEASURE_SEMANTIC.SCENARIO_ROI_ON_FIXED]: MEASURE_ID.ROI_SCENARIO_ON_FIXED,
};

/**
 * Resolves a semantic tag to a canonical measure id.
 */
export function resolveSemanticToMeasureId(semantic: MeasureSemantic): MeasureId {
  return SEMANTIC_TO_MEASURE[semantic];
}
