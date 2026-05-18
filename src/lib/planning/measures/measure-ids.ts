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

  /** Forward forecast engine (`evaluateForwardForecast`). */
  FORECAST_MONTHS_TO_TARGET: "forecast.targets.monthsToTarget",
  FORECAST_FIRST_SATURATION_MONTH: "forecast.operational.firstSaturationMonth",
  FORECAST_MARGIN_TREND_PCT: "forecast.financial.marginTrendPct",
  FORECAST_END_REVENUE: "forecast.financial.endRevenue",
  FORECAST_TARGET_ATTAINMENT_PCT: "forecast.targets.attainmentPct",

  /** Sales Plan OS — annual SAR totals from `buildSalesPlanModel`. */
  SALES_PLAN_REVENUE_ANNUAL_SAR: "salesPlan.revenue.annualSar",
  SALES_PLAN_AWARDS_ANNUAL: "salesPlan.awards.annualRequired",
  SALES_PLAN_CAPACITY_LOAD: "salesPlan.capacity.loadIndex",
  SALES_PLAN_PORTFOLIO_ADV: "salesPlan.portfolio.weightedAdv",

  /** BU-centric aliases — same engines, explicit business-unit scope. */
  BU_REVENUE_SCENARIO_MONTHLY: "bu.revenue.scenarioMonthly",
  BU_NET_PROFIT_SCENARIO_MONTHLY: "bu.netProfit.scenarioMonthly",
  BU_ROI_SCENARIO_ON_FIXED: "bu.roi.scenarioOnFixed",
  BU_CM_BLENDED_STREAMS: "bu.cm.blendedStreams",

  /** Single-template service economics (`evaluateServiceEconomics`). */
  SERVICE_ECONOMICS_DIRECT_COST: "serviceEconomics.directCost",
  SERVICE_ECONOMICS_LOADED_COST: "serviceEconomics.loadedCost",
  SERVICE_ECONOMICS_SUGGESTED_PRICE: "serviceEconomics.suggestedPrice",

  /** Multi-line deal rollup (`evaluateDealEconomics`). */
  DEAL_DIRECT_COST: "deal.directCost",
  DEAL_LOADED_COST: "deal.loadedCost",
  DEAL_SUGGESTED_PRICE: "deal.suggestedPrice",
  DEAL_TOTAL_QUANTITY: "deal.totalQuantity",

  /** HR-backed operational feasibility (evaluateOperationalFeasibility). */
  OPERATIONAL_UTILIZATION_PCT: "operational.utilizationPct",
  OPERATIONAL_DEMAND_HOURS: "operational.demandHours",
  OPERATIONAL_SUPPLY_HOURS: "operational.supplyHours",
  OPERATIONAL_HIRING_FTE_GAP: "operational.hiringFteGap",
} as const;

export type MeasureId = (typeof MEASURE_ID)[keyof typeof MEASURE_ID];

/** Maps BU-scoped measure ids to legacy executive ids for parity tests. */
export const BU_MEASURE_EXEC_ALIAS: Partial<Record<MeasureId, MeasureId>> = {
  [MEASURE_ID.BU_REVENUE_SCENARIO_MONTHLY]: MEASURE_ID.REVENUE_SCENARIO_MONTHLY,
  [MEASURE_ID.BU_NET_PROFIT_SCENARIO_MONTHLY]: MEASURE_ID.NET_PROFIT_SCENARIO_MONTHLY,
  [MEASURE_ID.BU_ROI_SCENARIO_ON_FIXED]: MEASURE_ID.ROI_SCENARIO_ON_FIXED,
  [MEASURE_ID.BU_CM_BLENDED_STREAMS]: MEASURE_ID.CM_BLENDED_STREAMS,
};
