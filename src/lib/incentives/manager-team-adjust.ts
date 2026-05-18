import type { IncentiveExplainLine, ManagerTeamRule } from "@/types/incentives";

export function managerTeamMultiplier(
  rule: ManagerTeamRule,
  teamAttainment: number
): { mult: number; label: string } {
  if (teamAttainment >= rule.teamOverPct) {
    return {
      mult: rule.managerFullMultiplier + rule.managerOverTeamBonusPct,
      label: "team_over_achieved",
    };
  }
  if (teamAttainment >= rule.teamAchievedMinPct) {
    return { mult: rule.managerFullMultiplier, label: "team_achieved" };
  }
  return {
    mult: rule.managerUnderTeamMultiplier,
    label: "team_under_achieved",
  };
}

export function applyManagerTeamAdjustment(input: {
  rule: ManagerTeamRule;
  teamAttainment: number;
  managerLayerId: string;
  managerAmountSar: number;
  byLayer: Record<string, number>;
  byParticipant: Record<string, number>;
  participantIds: string[];
  explainLines: IncentiveExplainLine[];
  nextId: () => string;
}): number {
  const { mult, label } = managerTeamMultiplier(input.rule, input.teamAttainment);
  if (mult === 1) return 0;

  const before = input.managerAmountSar;
  const adjusted = before * mult;
  const delta = adjusted - before;

  input.byLayer[input.managerLayerId] =
    (input.byLayer[input.managerLayerId] ?? 0) + delta;

  for (const pid of input.participantIds) {
    const share =
      input.participantIds.length > 0
        ? delta / input.participantIds.length
        : delta;
    input.byParticipant[pid] = (input.byParticipant[pid] ?? 0) + share;
  }

  input.explainLines.push({
    id: input.nextId(),
    formulaId: "manager_team_rollup",
    label: `Manager team rule (${label})`,
    amountSar: delta,
    inputs: {
      teamAttainment: input.teamAttainment,
      multiplier: mult,
    },
    layerId: input.managerLayerId,
  });

  return delta;
}
