import { demoStreams } from "@/data/demo-seed";
import type { TierLine } from "@/lib/planning/workbook-engine";
import type { DemoRevenueStream } from "@/types/domain";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

const TIER_KEYS = ["tiny", "standard", "big", "mega"] as const;
/** Slight tier curve so intra-stream average ≈ stream headline CM when weights are flat. */
const CM_DELTA = [0.02, 0.005, -0.01, -0.03];

export function buildDefaultTierLines(stream: DemoRevenueStream): TierLine[] {
  return TIER_KEYS.map((tierKey, i) => ({
    tierKey,
    contributionMarginPct: Math.min(
      0.95,
      Math.max(0.05, stream.contributionMarginPct + (CM_DELTA[i] ?? 0))
    ),
    mixPctWithinStream: 0.25,
    blockWeightPct: i === 0 ? stream.revenueWeight : null,
    sortOrder: i,
  }));
}

export function resolveTierLines(
  overrides: Record<string, TierLine[] | undefined>,
  streamId: string
): TierLine[] {
  const o = overrides[streamId];
  if (o?.length) return o.map((l) => ({ ...l }));
  const stream =
    useWorkspaceStore.getState().streams.find((s) => s.id === streamId) ??
    demoStreams.find((s) => s.id === streamId);
  return stream ? buildDefaultTierLines(stream) : [];
}
