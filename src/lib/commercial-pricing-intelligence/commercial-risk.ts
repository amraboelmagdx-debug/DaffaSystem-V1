import type { CommercialRiskModifier } from "./types";

export const COMMERCIAL_RISK_PRESETS: CommercialRiskModifier[] = [
  {
    id: "difficult_client",
    label: "Difficult client",
    description: "Higher commercial friction and negotiation load.",
    priceMultiplier: 1.08,
    marginStressNote: "Expect margin pressure from scope churn.",
  },
  {
    id: "high_revision_risk",
    label: "High revision risk",
    description: "Creative or brand work with elevated change cycles.",
    priceMultiplier: 1.12,
  },
  {
    id: "compressed_timeline",
    label: "Compressed timeline",
    description: "Calendar risk priced into commercial recommendation.",
    priceMultiplier: 1.1,
  },
  {
    id: "enterprise_governance",
    label: "Enterprise governance",
    description: "Security, procurement, and compliance overhead.",
    priceMultiplier: 1.07,
  },
  {
    id: "approval_bottlenecks",
    label: "Approval bottlenecks",
    description: "Slow decision cycles extend delivery exposure.",
    priceMultiplier: 1.05,
  },
  {
    id: "unstable_scope",
    label: "Unstable scope",
    description: "Ambiguous brief or moving target increases delivery risk.",
    priceMultiplier: 1.14,
  },
  {
    id: "multilingual_coordination",
    label: "Multilingual coordination",
    description: "Localization and stakeholder alignment overhead.",
    priceMultiplier: 1.06,
  },
  {
    id: "stakeholder_overload",
    label: "Stakeholder overload",
    description: "Large committee surface area.",
    priceMultiplier: 1.09,
  },
];

export function resolveCommercialRisks(ids: string[]): { modifiers: CommercialRiskModifier[]; stack: number } {
  const map = new Map(COMMERCIAL_RISK_PRESETS.map((r) => [r.id, r]));
  const modifiers = ids.map((id) => map.get(id)).filter(Boolean) as CommercialRiskModifier[];
  const stack = modifiers.reduce((p, r) => p * Math.max(1e-9, r.priceMultiplier), 1);
  return { modifiers, stack };
}
