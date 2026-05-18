import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";
import type { FinancialTrajectory, TargetAttainmentSummary } from "@/types/forward-forecast";

const EPS = 1e-9;

export function projectTargetAttainment(
  financial: FinancialTrajectory,
  measures: ExecutiveWorkspaceMeasuresResult
): TargetAttainmentSummary {
  const workbookSalesTarget = measures.workbook.workbookTargets.salesTarget;
  const finalProjectedRevenue =
    financial.points[financial.points.length - 1]?.revenue ?? measures.activeEngine.revenue;
  const attainmentPct =
    workbookSalesTarget > EPS && Number.isFinite(workbookSalesTarget)
      ? (finalProjectedRevenue / workbookSalesTarget) * 100
      : 0;

  let monthsToTarget: number | null = null;
  if (Number.isFinite(workbookSalesTarget) && workbookSalesTarget < 1e14) {
    const hit = financial.points.findIndex((p) => p.revenue >= workbookSalesTarget);
    monthsToTarget = hit >= 0 ? hit + 1 : null;
  }

  return {
    workbookSalesTarget,
    finalProjectedRevenue,
    attainmentPct,
    monthsToTarget,
  };
}
