import type { OpportunityStage } from "@/types/domain";

export interface OpportunityRow {
  dealValue: number;
  probabilityPct: number;
  stage: OpportunityStage;
  expectedCloseDays?: number;
}

const STAGE_LEAKAGE: Record<OpportunityStage, number> = {
  discovery: 0.35,
  qualification: 0.28,
  proposal: 0.18,
  negotiation: 0.08,
  closed_won: 0,
  closed_lost: 1,
};

export function weightedRevenue(o: OpportunityRow) {
  return o.dealValue * o.probabilityPct;
}

export function pipelineHealthScore(rows: OpportunityRow[]) {
  if (!rows.length) return 0;
  const weighted = rows.reduce((s, r) => s + weightedRevenue(r), 0);
  const gross = rows.reduce((s, r) => s + r.dealValue, 0) || 1;
  return weighted / gross;
}

export function stageLeakage(stage: OpportunityStage) {
  return STAGE_LEAKAGE[stage] ?? 0.2;
}

export function coverageRatio(weightedPipeline: number, quota: number) {
  if (quota <= 0) return 0;
  return weightedPipeline / quota;
}
