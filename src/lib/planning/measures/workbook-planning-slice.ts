/**
 * Shared LOTF workbook slice — single entry for tier matrix → blended CM → targets.
 * Dashboard, Planning workbook panel, and future matrix views should call this
 * instead of re-deriving groups locally (prevents silent drift).
 */

import { resolveTierLines } from "@/data/default-tier-lines";
import {
  computeWorkbookTargets,
  pickBlendedMargin,
  type TierLine,
} from "@/lib/planning/workbook-engine";
import type { DemoRevenueStream } from "@/types/domain";

export function computeWorkbookPlanningSlice(input: {
  streams: DemoRevenueStream[];
  tierLineOverrides: Record<string, TierLine[]>;
  fixedCostsMonthly: number;
  npTargetPct: number;
}) {
  const groups = input.streams.map((s) => ({
    revenueStreamId: s.id,
    lines: resolveTierLines(input.tierLineOverrides, s.id),
  }));
  const blendedWorkbook = pickBlendedMargin(groups);
  const workbookTargets = computeWorkbookTargets({
    fixedCosts: input.fixedCostsMonthly,
    npTargetPct: input.npTargetPct,
    blendedContributionMargin: blendedWorkbook,
  });
  return { groups, blendedWorkbook, workbookTargets };
}
