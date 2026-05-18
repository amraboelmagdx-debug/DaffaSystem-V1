import type { TierLine } from "@/lib/planning/workbook-engine";
import type { PlanningWorkspaceDTO } from "@/server/planning/workspace";

/** Map PG `revenue_stream_deal_tier_lines` rows to workbook tier lines per stream. */
export function tierLineOverridesFromDealTierRows(
  rows: Array<Record<string, unknown>>,
  streamIds: Iterable<string>
): Record<string, TierLine[]> {
  const allowed = new Set(streamIds);
  const byStream = new Map<string, TierLine[]>();

  for (const row of rows) {
    const streamId = String(row.revenue_stream_id ?? "");
    if (!allowed.has(streamId)) continue;
    const tierKey = String(row.tier_key ?? "");
    if (!tierKey) continue;
    const line: TierLine = {
      tierKey,
      contributionMarginPct: Number(row.contribution_margin_pct ?? 0.38),
      mixPctWithinStream: Number(row.mix_pct_within_stream ?? 0.25),
      blockWeightPct:
        row.block_weight_pct != null ? Number(row.block_weight_pct) : null,
      sortOrder: Number(row.sort_order ?? 0),
    };
    const list = byStream.get(streamId) ?? [];
    list.push(line);
    byStream.set(streamId, list);
  }

  for (const lines of byStream.values()) {
    lines.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  return Object.fromEntries(byStream);
}

export function mergeTierLineOverridesWithServer(
  scenarioOverrides: Record<string, TierLine[] | undefined> | undefined,
  serverByStream: Record<string, TierLine[]>
): Record<string, TierLine[]> {
  const merged: Record<string, TierLine[]> = {};
  for (const [streamId, lines] of Object.entries(scenarioOverrides ?? {})) {
    if (lines?.length) merged[streamId] = lines.map((l) => ({ ...l }));
  }
  for (const [streamId, lines] of Object.entries(serverByStream)) {
    if (!merged[streamId]?.length) {
      merged[streamId] = lines.map((l) => ({ ...l }));
    }
  }
  return merged;
}

export function serverTierOverridesForWorkspace(
  dto: PlanningWorkspaceDTO,
  streamIds: string[]
): Record<string, TierLine[]> {
  return tierLineOverridesFromDealTierRows(dto.deal_tier_lines ?? [], streamIds);
}
