import type {
  IncentiveParticipant,
  IncentivePlan,
  IncentiveRoleOverride,
  LayerAllocationPolicy,
} from "@/types/incentives";

export function splitAmongParticipants(
  layerPool: number,
  participants: IncentiveParticipant[],
  policy: LayerAllocationPolicy,
  roleOverrides: IncentiveRoleOverride[],
  layerId: string,
  useWeights: boolean,
  useOverrides: boolean
): { jobRoleId: string; displayName: string; amountSar: number }[] {
  const parts =
    participants.length > 0
      ? participants
      : [
          {
            jobRoleId: "unassigned",
            layerId,
            displayName: "Unassigned",
            employeeCount: 1,
          },
        ];

  if (useOverrides) {
    const withOverride = parts.filter((p) =>
      roleOverrides.some(
        (o) => o.layerId === layerId && o.jobRoleId === p.jobRoleId && o.splitPctOfLayer != null
      )
    );
    if (withOverride.length > 0) {
      return withOverride.map((p) => {
        const o = roleOverrides.find(
          (r) => r.layerId === layerId && r.jobRoleId === p.jobRoleId
        );
        const pct = (o?.splitPctOfLayer ?? 0) / 100;
        return {
          jobRoleId: p.jobRoleId,
          displayName: p.displayName,
          amountSar: layerPool * pct,
        };
      });
    }
  }

  if (useWeights && policy === "by_headcount") {
    const totalHc = parts.reduce((s, p) => s + Math.max(1, p.employeeCount), 0);
    return parts.map((p) => ({
      jobRoleId: p.jobRoleId,
      displayName: p.displayName,
      amountSar: (layerPool * Math.max(1, p.employeeCount)) / totalHc,
    }));
  }

  const count = parts.length;
  const share = layerPool / count;
  return parts.map((p) => ({
    jobRoleId: p.jobRoleId,
    displayName: p.displayName,
    amountSar: share,
  }));
}

export function resolvePhaseWeightForLayer(
  layerKey: string,
  phaseWeights: import("@/types/incentives").SalesPhaseWeights
): number {
  const map: Record<string, keyof import("@/types/incentives").SalesPhaseWeights> = {
    lead_gen: "lead_gen",
    technical: "technical",
    financial: "financial",
    closer: "closing",
    closing: "closing",
  };
  const pk = map[layerKey];
  return pk ? phaseWeights[pk] : 1;
}
