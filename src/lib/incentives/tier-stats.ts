import type { OpportunityTierKey } from "@/types/sales-plan";

export type TierValueSample = {
  tierKey: OpportunityTierKey;
  values: number[];
};

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Collect avg deal values per tier from sales-plan wizard cells for a service. */
export function tierStatsFromWizardCells(
  serviceId: string,
  cells: Record<string, { avgDealValueSar: number; exists?: boolean }>
): TierValueSample[] {
  const tiers: OpportunityTierKey[] = ["tiny", "standard", "big", "mega"];
  return tiers.map((tierKey) => {
    const cell = cells[`${serviceId}:${tierKey}`];
    const v = cell?.exists !== false && cell?.avgDealValueSar ? cell.avgDealValueSar : 0;
    return { tierKey, values: v > 0 ? [v] : [] };
  });
}
