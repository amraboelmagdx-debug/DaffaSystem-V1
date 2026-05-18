import type { OpportunityTierProfileScope } from "@/types/incentives";
import type { OpportunityTierDefinition, OpportunityTierKey } from "@/types/sales-plan";
import { resolveOpportunityTierKey } from "@/lib/planning/opportunity-tier-display";

export type TierResolutionContext = {
  tiers: OpportunityTierDefinition[];
  scope: OpportunityTierProfileScope | "company_default";
  serviceId?: string | null;
  tierKey: OpportunityTierKey;
  dealValueSar: number;
  fromExplicitTierKey?: boolean;
};

export function formatTierBand(def: OpportunityTierDefinition | undefined): string {
  if (!def) return "—";
  const max = def.maxValueSar != null ? def.maxValueSar.toLocaleString() : "∞";
  return `${def.minValueSar.toLocaleString()}–${max} SAR`;
}

/** Manager-readable one-line reason for tier classification. */
export function explainTierMatch(ctx: TierResolutionContext): string {
  if (ctx.fromExplicitTierKey) {
    return `${capitalize(ctx.tierKey)} — assigned explicitly on the opportunity (not re-derived from value).`;
  }
  const def = ctx.tiers.find((t) => t.key === ctx.tierKey);
  const scopeLabel =
    ctx.scope === "service"
      ? `service profile${ctx.serviceId ? ` (${ctx.serviceId})` : ""}`
      : ctx.scope === "bu"
        ? "BU profile"
        : ctx.scope === "global_default"
          ? "global defaults"
          : "company / global fallback";
  return `${capitalize(ctx.tierKey)} — ${ctx.dealValueSar.toLocaleString()} SAR falls within ${formatTierBand(def)} (${scopeLabel}).`;
}

export function resolveTierForDealValue(input: {
  dealValueSar: number;
  tiers: OpportunityTierDefinition[];
}): OpportunityTierKey {
  return resolveOpportunityTierKey(input.dealValueSar, input.tiers);
}

function capitalize(k: string): string {
  return k.charAt(0).toUpperCase() + k.slice(1);
}
