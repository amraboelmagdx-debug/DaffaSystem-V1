import type { IncentiveStackingPolicy } from "@/types/incentives";

export function applyStackingMultipliers(
  policy: IncentiveStackingPolicy,
  multipliers: number[]
): number {
  const filtered = multipliers.filter((m) => Number.isFinite(m) && m > 0);
  if (!filtered.length) return 1;
  if (policy === "additive") {
    return Math.min(filtered.reduce((s, m) => s + m, 0), 3);
  }
  if (policy === "max_of") {
    return Math.max(...filtered);
  }
  return filtered.reduce((p, m) => p * m, 1);
}
