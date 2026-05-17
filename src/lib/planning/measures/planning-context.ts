/**
 * Lightweight shared input for planning evaluation (Phase 2).
 *
 * 💡 ليه PlanningContext؟
 * بدل ما كل دالة تأخذ company + streams + scenarios + ... منفصلة،
 * نمرّر كائن واحد يبقى مستقبلاً نقطة التوسعة (أبعاد، افتراضات، فعليات)
 * من غير ما نبني “مكعب” متعدد الأبعاد الآن.
 */

import type { DemoCompany, DemoOpportunity, DemoScenario, DemoRevenueStream } from "@/types/domain";
import { resolveBusinessUnitIdForCompany } from "@/lib/platform-economics/operational-unit";
import type { TierLine } from "@/lib/planning/workbook-engine";

export type PlanningContext = {
  company: DemoCompany;
  /** HR business unit id when company is linked via workforce sync. */
  hrBusinessUnitId?: string | null;
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  scenarios: DemoScenario[];
  activeScenarioId: string;
  tierLineOverrides: Record<string, TierLine[]>;
};

export function buildPlanningContext(input: {
  company: DemoCompany;
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  scenarios: DemoScenario[];
  activeScenarioId: string;
  tierLineOverrides: Record<string, TierLine[]>;
}): PlanningContext {
  return {
    ...input,
    hrBusinessUnitId:
      input.company.hrBusinessUnitId ??
      resolveBusinessUnitIdForCompany(input.company.id, [input.company]) ??
      null,
  };
}

/** @deprecated Prefer PlanningContext — same shape, kept for incremental refactors */
export type ExecutiveWorkspaceMeasuresInput = PlanningContext;
