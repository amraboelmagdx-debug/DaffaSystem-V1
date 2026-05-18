import type {
  DeltaDirection,
  DeltaSignificance,
  NumericDelta,
  PostureDelta,
  PostureDeltaField,
  StringDelta,
} from "@/types/scenario-comparison";
import type { PostureLevel } from "@/types/scenario-governance";

const EPS = 1e-9;

export const SIGNIFICANCE_LOW_PCT = 2;
export const SIGNIFICANCE_HIGH_PCT = 10;

export function computeNumericDelta(base: number, compare: number): NumericDelta {
  const absolute = compare - base;
  const percent =
    Math.abs(base) > EPS ? (absolute / Math.abs(base)) * 100 : compare !== 0 ? null : 0;

  let direction: DeltaDirection = "flat";
  if (absolute > EPS) direction = "up";
  else if (absolute < -EPS) direction = "down";

  const absPct = percent !== null ? Math.abs(percent) : Math.abs(absolute);
  let significance: DeltaSignificance = "low";
  if (percent !== null) {
    if (absPct >= SIGNIFICANCE_HIGH_PCT) significance = "high";
    else if (absPct >= SIGNIFICANCE_LOW_PCT) significance = "medium";
  } else if (Math.abs(absolute) > EPS) {
    significance = "medium";
  }

  return {
    base,
    compare,
    absolute,
    percent: percent !== null && Number.isFinite(percent) ? percent : null,
    direction,
    significance,
  };
}

export function computeStringDelta(base: string, compare: string): StringDelta {
  const b = base.trim();
  const c = compare.trim();
  return { base: b, compare: c, changed: b !== c };
}

export function computePostureDelta(
  field: PostureDeltaField,
  base: PostureLevel,
  compare: PostureLevel
): PostureDelta {
  return { field, base, compare, shifted: base !== compare };
}

export function postureLevelScore(level: PostureLevel): number {
  switch (level) {
    case "low":
      return 0;
    case "neutral":
      return 1;
    case "high":
      return 2;
  }
}

/** v1 capacity pressure proxy from utilization posture + fixed-cost overlay shift. */
export function computeCapacityPressureProxy(input: {
  baseUtilization: PostureLevel;
  compareUtilization: PostureLevel;
  baseFixedCosts: number;
  compareFixedCosts: number;
}): { index: number; baseLabel: string; compareLabel: string; delta: NumericDelta } {
  const baseIndex =
    postureLevelScore(input.baseUtilization) * 30 +
    (input.baseFixedCosts > 0 ? 20 : 0);
  const compareIndex =
    postureLevelScore(input.compareUtilization) * 30 +
    (input.compareFixedCosts > 0 ? 20 : 0);
  const fixedDelta = computeNumericDelta(input.baseFixedCosts, input.compareFixedCosts);
  const index = compareIndex + (fixedDelta.percent ?? 0) * 0.5;

  return {
    index,
    baseLabel: input.baseUtilization,
    compareLabel: input.compareUtilization,
    delta: computeNumericDelta(baseIndex, index),
  };
}
