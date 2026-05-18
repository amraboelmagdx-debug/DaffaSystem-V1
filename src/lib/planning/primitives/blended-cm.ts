import { contributionFromStreams } from "@/lib/calculations/engine";
import type { DemoRevenueStream } from "@/types/domain";

/** Stream-weighted contribution margin (scenario path). Canonical wrapper over `contributionFromStreams`. */
export function blendedCmFromStreams(
  streams: DemoRevenueStream[],
  fallbackContributionMarginPct: number
): number {
  if (!streams.length) return fallbackContributionMarginPct;
  return contributionFromStreams(
    streams.map((s) => ({
      revenueWeight: s.revenueWeight,
      contributionMarginPct: s.contributionMarginPct,
    }))
  );
}
