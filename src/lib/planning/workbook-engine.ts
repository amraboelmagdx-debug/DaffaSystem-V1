/**
 * Planning math aligned with LOTF workbook patterns:
 * - Blended CM (Excel D16): sum over stream blocks of AVERAGE(tier margins in block) × blockWeight (E on block head)
 * - Fallback: weighted average of tier lines using mix_pct_within_stream when block weights absent
 * - Sales target: Fixed / (blendedCM − NP_target)
 * - NP at target revenue: N*blended − Fixed (workbook O7 pattern)
 * - ROI-style ratio: NP_at_target / Fixed
 */

const EPS = 1e-9;

export interface TierLine {
  tierKey: string;
  contributionMarginPct: number;
  /** Within-stream weights (should sum to ~1 per stream when used alone). */
  mixPctWithinStream: number;
  /**
   * Excel E on the first row of each 4-tier stream block (portfolio share driver).
   * When set on any line of a stream block, tier margins in that stream are averaged (workbook D16).
   */
  blockWeightPct?: number | null;
  sortOrder?: number;
}

export interface StreamTierGroup {
  revenueStreamId: string;
  lines: TierLine[];
}

/** Workbook D16 pattern: Σ_s ( avg(D in block_s) × E_s ). */
export function blendedMarginFromWorkbookBlocks(groups: StreamTierGroup[]): number {
  let total = 0;
  for (const g of groups) {
    const margins = g.lines
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((l) => Math.min(0.999, Math.max(0, l.contributionMarginPct)));
    if (!margins.length) continue;
    const avg =
      margins.reduce((s, m) => s + m, 0) / (margins.length || 1);
    const bw =
      g.lines.find((l) => l.blockWeightPct != null && l.blockWeightPct > 0)
        ?.blockWeightPct ?? g.lines[0]?.blockWeightPct ?? 0;
    total += avg * Math.min(1, Math.max(0, bw));
  }
  return Math.min(0.999, Math.max(0, total));
}

/** Simpler model: each line is a (margin × mix) contribution, mixes normalized per stream. */
export function blendedMarginFromMixLines(lines: TierLine[]): number {
  const w = lines.reduce((s, l) => s + Math.max(0, l.mixPctWithinStream), 0) || 1;
  return lines.reduce(
    (acc, l) =>
      acc +
      (Math.max(0, l.mixPctWithinStream) / w) *
        Math.min(0.999, Math.max(0, l.contributionMarginPct)),
    0
  );
}

export function pickBlendedMargin(groups: StreamTierGroup[]): number {
  const hasBlock = groups.some((g) =>
    g.lines.some((l) => l.blockWeightPct != null && l.blockWeightPct > 0)
  );
  if (hasBlock) return blendedMarginFromWorkbookBlocks(groups);
  const flat = groups.flatMap((g) => g.lines);
  return flat.length ? blendedMarginFromMixLines(flat) : 0;
}

export function salesTargetFromBlendedMargin(
  fixedCosts: number,
  blendedContributionMargin: number,
  npTargetPct: number
): number {
  const cm = Math.min(0.999, Math.max(0, blendedContributionMargin));
  const np = Math.min(cm - EPS, Math.max(0, npTargetPct));
  const denom = cm - np;
  if (denom <= EPS) return Number.POSITIVE_INFINITY;
  return fixedCosts / denom;
}

export function netProfitAtSalesTarget(
  salesTarget: number,
  blendedContributionMargin: number,
  fixedCosts: number
): number {
  const cm = Math.min(0.999, Math.max(0, blendedContributionMargin));
  return salesTarget * cm - fixedCosts;
}

export function roiFromNpAndFixed(netProfitAtTarget: number, fixedCosts: number): number {
  if (fixedCosts <= EPS) return 0;
  return netProfitAtTarget / fixedCosts;
}

export function computeWorkbookTargets(input: {
  fixedCosts: number;
  npTargetPct: number;
  blendedContributionMargin: number;
}): {
  blended: number;
  salesTarget: number;
  netProfitAtTarget: number;
  roi: number;
} {
  const blended = Math.min(0.999, Math.max(0, input.blendedContributionMargin));
  const salesTarget = salesTargetFromBlendedMargin(
    input.fixedCosts,
    blended,
    input.npTargetPct
  );
  const netProfitAtTarget = netProfitAtSalesTarget(
    salesTarget,
    blended,
    input.fixedCosts
  );
  const roi = roiFromNpAndFixed(netProfitAtTarget, input.fixedCosts);
  return { blended, salesTarget, netProfitAtTarget, roi };
}
