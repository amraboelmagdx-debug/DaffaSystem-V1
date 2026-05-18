import {
  DEFAULT_OPPORTUNITY_TIERS,
  mergeOpportunityTiersWithDefaults,
} from "@/data/opportunity-tiers-defaults";
import type { DemoCompany } from "@/types/domain";
import type { OpportunityTierProfile, OpportunityTierProfileScope } from "@/types/incentives";
import type { OpportunityTierDefinition, OpportunityTierKey } from "@/types/sales-plan";
import { resolveOpportunityTierKey } from "@/lib/planning/opportunity-tier-display";
import type { TierResolutionContext } from "@/lib/planning/explain-tier-match";
import { resolveTierForDealValue } from "@/lib/planning/explain-tier-match";

export type ResolvedTierProfile = {
  tiers: OpportunityTierDefinition[];
  scope: OpportunityTierProfileScope | "company_default";
  serviceId?: string | null;
};

/** Priority: service → BU → global_default → company merged defaults. */
export function resolveOpportunityTierProfileContext(input: {
  company?: Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null;
  serviceId?: string | null;
  profiles?: OpportunityTierProfile[];
}): ResolvedTierProfile {
  const buId = input.company?.hrBusinessUnitId;
  const serviceId = input.serviceId ?? undefined;
  const custom = input.profiles ?? [];

  const serviceMatch = custom.find(
    (p) => p.scope === "service" && p.serviceId === serviceId && p.hrBusinessUnitId === buId
  );
  if (serviceMatch) {
    return { tiers: serviceMatch.tiers, scope: "service", serviceId };
  }

  const buMatch = custom.find(
    (p) => p.scope === "bu" && p.hrBusinessUnitId === buId
  );
  if (buMatch) {
    return { tiers: buMatch.tiers, scope: "bu", serviceId: null };
  }

  const globalMatch = custom.find((p) => p.scope === "global_default");
  if (globalMatch) {
    return { tiers: globalMatch.tiers, scope: "global_default", serviceId: null };
  }

  return {
    tiers: mergeOpportunityTiersWithDefaults(
      input.company?.opportunityTiers ?? DEFAULT_OPPORTUNITY_TIERS
    ),
    scope: "company_default",
    serviceId: null,
  };
}

export function resolveOpportunityTierProfile(input: {
  company?: Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null;
  serviceId?: string | null;
  profiles?: OpportunityTierProfile[];
}): OpportunityTierDefinition[] {
  return resolveOpportunityTierProfileContext(input).tiers;
}

export function resolveDealTierContext(
  dealValueSar: number,
  input: {
    company?: Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null;
    serviceId?: string | null;
    profiles?: OpportunityTierProfile[];
    explicitTierKey?: OpportunityTierKey | null;
  }
): TierResolutionContext {
  const resolved = resolveOpportunityTierProfileContext({
    company: input.company,
    serviceId: input.serviceId,
    profiles: input.profiles,
  });
  if (input.explicitTierKey) {
    return {
      tiers: resolved.tiers,
      scope: resolved.scope,
      serviceId: input.serviceId,
      tierKey: input.explicitTierKey,
      dealValueSar,
      fromExplicitTierKey: true,
    };
  }
  const tierKey = resolveTierForDealValue({
    dealValueSar,
    tiers: resolved.tiers,
  });
  return {
    tiers: resolved.tiers,
    scope: resolved.scope,
    serviceId: input.serviceId,
    tierKey,
    dealValueSar,
    fromExplicitTierKey: false,
  };
}

export function resolveDealTierKey(
  dealValueSar: number,
  company?: Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null,
  profiles?: OpportunityTierProfile[],
  serviceId?: string | null
): OpportunityTierKey {
  return resolveDealTierContext(dealValueSar, { company, profiles, serviceId }).tierKey;
}
