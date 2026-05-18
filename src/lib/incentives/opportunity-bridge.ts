import type { DemoOpportunity } from "@/types/domain";
import type { IncentiveDealInput, IncentiveParticipant } from "@/types/incentives";
import type { OpportunityTierProfile } from "@/types/incentives";
import type { JobRole } from "@/types/hr-workforce";
import type { DemoCompany } from "@/types/domain";
import type { OpportunityTierDefinition } from "@/types/sales-plan";
import {
  resolveDealTierContext,
  resolveOpportunityTierProfileContext,
} from "@/lib/planning/resolve-opportunity-tier-profile";
import {
  explainTierMatch,
  resolveTierForDealValue,
  type TierResolutionContext,
} from "@/lib/planning/explain-tier-match";

function buildDealFromTierContext(
  base: Omit<IncentiveDealInput, "tierKey" | "tierResolution">,
  tierCtx: TierResolutionContext
): IncentiveDealInput {
  return {
    ...base,
    tierKey: tierCtx.tierKey,
    tierResolution: {
      scope: tierCtx.scope,
      serviceId: tierCtx.serviceId,
      fromExplicitTierKey: tierCtx.fromExplicitTierKey,
      summary: explainTierMatch(tierCtx),
    },
  };
}

export function demoOpportunityToIncentiveDeal(
  opp: DemoOpportunity,
  tiersOrCompany?: OpportunityTierDefinition[] | Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null,
  accrualMonth?: string,
  profiles?: OpportunityTierProfile[]
): IncentiveDealInput {
  const month = accrualMonth ?? new Date().toISOString().slice(0, 7);
  const base = {
    id: opp.id,
    label: opp.name,
    dealValueSar: opp.dealValue,
    marginSar: opp.marginSar,
    referral: opp.referral ?? false,
    clientType: opp.clientType ?? "existing_client",
    complexity: opp.complexity ?? "normal",
    accrualMonth: month,
    revenueStreamId: opp.revenueStreamId,
    salesPhaseAttribution: opp.salesPhaseAttribution,
  } as const;

  if (Array.isArray(tiersOrCompany)) {
    const tierCtx: TierResolutionContext = {
      tiers: tiersOrCompany,
      scope: "company_default",
      serviceId: opp.revenueStreamId ?? null,
      tierKey:
        opp.tierKey ??
        resolveTierForDealValue({ dealValueSar: opp.dealValue, tiers: tiersOrCompany }),
      dealValueSar: opp.dealValue,
      fromExplicitTierKey: Boolean(opp.tierKey),
    };
    return buildDealFromTierContext(base, tierCtx);
  }

  const tierCtx = resolveDealTierContext(opp.dealValue, {
    company: tiersOrCompany ?? null,
    serviceId: opp.revenueStreamId,
    profiles,
    explicitTierKey: opp.tierKey ?? null,
  });
  return buildDealFromTierContext(base, tierCtx);
}

export function incentiveDealFromValues(input: {
  id: string;
  label: string;
  dealValueSar: number;
  marginSar?: number;
  referral: boolean;
  clientType: "new_client" | "existing_client";
  complexity: IncentiveDealInput["complexity"];
  accrualMonth: string;
  company?: Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null;
  profiles?: OpportunityTierProfile[];
  revenueStreamId?: string | null;
  tierKey?: IncentiveDealInput["tierKey"];
}): IncentiveDealInput {
  const tierCtx = resolveDealTierContext(input.dealValueSar, {
    company: input.company,
    serviceId: input.revenueStreamId,
    profiles: input.profiles,
    explicitTierKey: input.tierKey ?? null,
  });
  return buildDealFromTierContext(
    {
      id: input.id,
      label: input.label,
      dealValueSar: input.dealValueSar,
      marginSar: input.marginSar,
      referral: input.referral,
      clientType: input.clientType,
      complexity: input.complexity,
      accrualMonth: input.accrualMonth,
      revenueStreamId: input.revenueStreamId,
    },
    tierCtx
  );
}

const LAYER_BY_ROLE_HINT: Record<string, string> = {
  sales: "layer-close",
  bd: "layer-lead",
  business: "layer-lead",
  manager: "layer-mgr",
  director: "layer-mgr",
};

export function participantsFromHrRoles(
  roles: JobRole[],
  hrBusinessUnitId: string
): IncentiveParticipant[] {
  const inBu = roles.filter(
    (r) => !r.archived && r.businessUnitId === hrBusinessUnitId
  );
  return inBu.map((r) => {
    const nameLower = r.name.toLowerCase();
    let layerId = "layer-close";
    for (const [hint, lid] of Object.entries(LAYER_BY_ROLE_HINT)) {
      if (nameLower.includes(hint)) {
        layerId = lid;
        break;
      }
    }
    if (r.operationalRoleType === "indirect") layerId = "layer-mgr";
    return {
      jobRoleId: r.id,
      layerId,
      displayName: r.name,
      employeeCount: Math.max(1, r.employeeCount),
    };
  });
}

export { resolveOpportunityTierProfileContext };
