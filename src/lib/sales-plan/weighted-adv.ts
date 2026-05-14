import type { OpportunityTierKey } from "@/types/sales-plan";

const EPS = 1e-9;

/** Mix-weighted ADV for a single service (exists tiers only). */
export function weightedAdvForService(
  serviceId: string,
  cells: {
    serviceId: string;
    tierKey: OpportunityTierKey;
    exists: boolean;
    adv: number;
    mix: number;
  }[]
): number {
  let inner = 0;
  let mixSum = 0;
  for (const c of cells) {
    if (c.serviceId !== serviceId || !c.exists) continue;
    inner += Math.max(0, c.adv) * Math.max(0, c.mix);
    mixSum += Math.max(0, c.mix);
  }
  return mixSum > EPS ? inner / mixSum : 0;
}
