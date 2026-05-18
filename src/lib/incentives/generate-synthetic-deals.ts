import type { OpportunityTierKey } from "@/types/sales-plan";
import type { IncentiveDealInput, OpportunityTierProfile } from "@/types/incentives";
import type { DemoCompany } from "@/types/domain";
import type { IncentiveProposalComplexity } from "@/types/incentives";
import { incentiveDealFromValues } from "@/lib/incentives/opportunity-bridge";

export type OpportunityMixInput = {
  count: number;
  tierMix: Partial<Record<OpportunityTierKey, number>>;
  referralPct: number;
  newClientPct: number;
  avgDealValueSar: number;
  marginPct?: number;
  accrualMonth?: string;
  company?: Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null;
  profiles?: OpportunityTierProfile[];
  revenueStreamId?: string | null;
};

const COMPLEXITIES: Exclude<IncentiveProposalComplexity, "any">[] = [
  "normal",
  "known_budget",
  "internal_team",
  "internal_plus_vendors",
];

export function generateSyntheticDeals(mix: OpportunityMixInput): IncentiveDealInput[] {
  const month = mix.accrualMonth ?? new Date().toISOString().slice(0, 7);
  const tiers: OpportunityTierKey[] = ["tiny", "standard", "big", "mega"];
  const weights = tiers.map((t) => Math.max(0, mix.tierMix[t] ?? 0));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;

  const deals: IncentiveDealInput[] = [];
  for (let i = 0; i < mix.count; i++) {
    let r = Math.random() * sum;
    let tierKey: OpportunityTierKey = "standard";
    for (let j = 0; j < tiers.length; j++) {
      r -= weights[j];
      if (r <= 0) {
        tierKey = tiers[j];
        break;
      }
    }
    const dealValueSar = Math.round(mix.avgDealValueSar * (0.7 + Math.random() * 0.6));
    const marginPct = mix.marginPct ?? 0.35;
    deals.push(
      incentiveDealFromValues({
        id: `sim-mix-${i}`,
        label: `Synthetic ${tierKey} #${i + 1}`,
        dealValueSar,
        marginSar: Math.round(dealValueSar * marginPct),
        referral: Math.random() < mix.referralPct,
        clientType: Math.random() < mix.newClientPct ? "new_client" : "existing_client",
        complexity: COMPLEXITIES[Math.floor(Math.random() * COMPLEXITIES.length)],
        accrualMonth: month,
        company: mix.company,
        profiles: mix.profiles,
        revenueStreamId: mix.revenueStreamId,
      })
    );
  }
  return deals;
}
