/**
 * Maps Sales Plan OS model outputs onto canonical `MEASURE_ID` keys where they overlap
 * conceptually with executive KPIs (annual SAR basis vs monthly company P&L).
 *
 * 💡 ليه في فرق بين إيراد الداشبورد وإيراد خطة المبيعات؟
 * - الداشبورد: شهري + عملة/نموذج الشركة التجريبي.
 * - خطة المبيعات: سنوي SAR ومشتق من `buildSalesPlanModel` (Portfolio / tiers / ADV).
 * لا تخلطهم في نفس البطاقة بدون توضيح — لكن نفس المفتاح المعنوي يساعد على التدقيق لاحقاً.
 */

import type { SalesPlanModel } from "@/lib/sales-plan/build-model";
import { MEASURE_ID, type MeasureId } from "./measure-ids";

export type PlanningMeasureValue = {
  id: MeasureId;
  value: number;
  unit: "sar_annual" | "count" | "ratio" | "index" | "currency_monthly";
};

export function mapSalesPlanModelToMeasureValues(model: SalesPlanModel): PlanningMeasureValue[] {
  const awardsAnnual = model.awardAnnual.requiredCount;

  return [
    {
      id: MEASURE_ID.SALES_PLAN_REVENUE_ANNUAL_SAR,
      value: model.annualRevenueSar,
      unit: "sar_annual",
    },
    {
      id: MEASURE_ID.SALES_PLAN_AWARDS_ANNUAL,
      value: awardsAnnual,
      unit: "count",
    },
    {
      id: MEASURE_ID.SALES_PLAN_CAPACITY_LOAD,
      value: model.capacity.loadIndex,
      unit: "index",
    },
    {
      id: MEASURE_ID.SALES_PLAN_PORTFOLIO_ADV,
      value: model.portfolioAdv,
      unit: "sar_annual",
    },
  ];
}

export function salesPlanMeasuresIndex(
  model: SalesPlanModel
): Partial<Record<MeasureId, number>> {
  return Object.fromEntries(
    mapSalesPlanModelToMeasureValues(model).map((m) => [m.id, m.value])
  ) as Partial<Record<MeasureId, number>>;
}
