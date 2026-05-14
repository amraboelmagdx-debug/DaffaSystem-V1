/**
 * Canonical planning measure identifiers (Phase 1 — convergence).
 *
 * 💡 لماذا معرفات ثابتة؟
 * عشان أي شاشة (داشبورد، سيناريو، دفتر تخطيط، خطة مبيعات) تقرأ نفس المفتاح،
 * ونقدر لاحقاً نربطها بسجل صيغ + شرح مصدر الرقم (lineage) بدون تغيير واجهات المستخدم.
 */

export const MEASURE_ID = {
  /** Monthly revenue — baseline path (`runForecastEngine`, no scenario levers). */
  REVENUE_BASELINE_MONTHLY: "exec.revenue.baselineMonthly",
  /** Monthly revenue after scenario levers (`applyScenario` / `runForecastEngine`). */
  REVENUE_SCENARIO_MONTHLY: "exec.revenue.scenarioMonthly",
  GROSS_PROFIT_SCENARIO_MONTHLY: "exec.grossProfit.scenarioMonthly",
  NET_PROFIT_SCENARIO_MONTHLY: "exec.netProfit.scenarioMonthly",
  ROI_SCENARIO_ON_FIXED: "exec.roi.scenarioOnFixed",
  EBITDA_SCENARIO_MONTHLY: "exec.ebitda.scenarioMonthly",
  NP_PCT_SCENARIO: "exec.npPct.scenario",
  OPERATING_MARGIN_SCENARIO: "exec.operatingMargin.scenario",
  SALES_TARGET_SCENARIO_MONTHLY: "exec.salesTarget.scenarioMonthly",
  SALES_GAP_SCENARIO_MONTHLY: "exec.salesGap.scenarioMonthly",
  BURN_RATE_SCENARIO_MONTHLY: "exec.burn.scenarioMonthly",

  /** Blended CM from revenue streams only (simple weight mix — executive P&L path). */
  CM_BLENDED_STREAMS: "exec.cm.blendedStreams",
  /** Blended CM from LOTF-style tier matrix (`pickBlendedMargin`). */
  CM_BLENDED_WORKBOOK: "exec.cm.blendedWorkbook",

  WORKBOOK_SALES_TARGET: "workbook.salesTarget",
  WORKBOOK_NP_AT_TARGET: "workbook.netProfitAtSalesTarget",
  WORKBOOK_ROI_ON_FIXED: "workbook.roiOnFixed",

  PIPELINE_WEIGHTED_VALUE: "pipeline.weightedValue",
  PIPELINE_HEALTH: "pipeline.healthScore",
  PIPELINE_COVERAGE: "pipeline.coverageVsQuota",

  FORECAST_ACHIEVEMENT_PROXY: "exec.forecastAchievement.planProxy",

  /** Sales Plan OS — annual SAR totals from `buildSalesPlanModel`. */
  SALES_PLAN_REVENUE_ANNUAL_SAR: "salesPlan.revenue.annualSar",
  SALES_PLAN_AWARDS_ANNUAL: "salesPlan.awards.annualRequired",
  SALES_PLAN_CAPACITY_LOAD: "salesPlan.capacity.loadIndex",
  SALES_PLAN_PORTFOLIO_ADV: "salesPlan.portfolio.weightedAdv",
} as const;

export type MeasureId = (typeof MEASURE_ID)[keyof typeof MEASURE_ID];
