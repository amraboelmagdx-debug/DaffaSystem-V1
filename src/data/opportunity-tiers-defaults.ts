import type { OpportunityTierDefinition, OpportunityTierKey } from "@/types/sales-plan";

/** Default “Opportunity Tiers” (replaces informal deal-size naming). SAR bands per product vision. */
export const DEFAULT_OPPORTUNITY_TIERS: OpportunityTierDefinition[] = [
  {
    key: "tiny",
    labelKey: "tierTinyName",
    minValueSar: 0,
    maxValueSar: 500_000,
    classLabel: "D",
    strategicPurposeKey: "tierTinyPurpose",
    cashFlowImpact: 0.72,
    growthImpact: 0.22,
    stabilityScore: 0.78,
    riskLevel: "low",
    expectedSalesCycleDays: 30,
    operationalComplexity: 2,
  },
  {
    key: "standard",
    labelKey: "tierStandardName",
    minValueSar: 500_000,
    maxValueSar: 2_000_000,
    classLabel: "C",
    strategicPurposeKey: "tierStandardPurpose",
    cashFlowImpact: 0.55,
    growthImpact: 0.38,
    stabilityScore: 0.7,
    riskLevel: "low",
    expectedSalesCycleDays: 60,
    operationalComplexity: 3,
  },
  {
    key: "big",
    labelKey: "tierBigName",
    minValueSar: 2_000_000,
    maxValueSar: 7_000_000,
    classLabel: "B",
    strategicPurposeKey: "tierBigPurpose",
    cashFlowImpact: 0.42,
    growthImpact: 0.55,
    stabilityScore: 0.55,
    riskLevel: "medium",
    expectedSalesCycleDays: 90,
    operationalComplexity: 4,
  },
  {
    key: "mega",
    labelKey: "tierMegaName",
    minValueSar: 7_000_000,
    maxValueSar: null,
    classLabel: "A",
    strategicPurposeKey: "tierMegaPurpose",
    cashFlowImpact: 0.35,
    growthImpact: 0.72,
    stabilityScore: 0.42,
    riskLevel: "high",
    expectedSalesCycleDays: 120,
    operationalComplexity: 5,
  },
];

const RISK: OpportunityTierDefinition["riskLevel"][] = ["low", "medium", "high", "critical"];

function clamp01(n: unknown, fallback: number): number {
  const v = typeof n === "number" && !Number.isNaN(n) ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}

function clampRisk(n: unknown, fallback: OpportunityTierDefinition["riskLevel"]) {
  return RISK.includes(n as never) ? (n as OpportunityTierDefinition["riskLevel"]) : fallback;
}

/**
 * Merges persisted / API tier rows with defaults so every key exists and numeric fields are safe.
 * Prevents runtime errors (e.g. missing minValueSar) after localStorage migrations.
 */
export function mergeOpportunityTiersWithDefaults(
  stored?: OpportunityTierDefinition[] | null
): OpportunityTierDefinition[] {
  const bases = DEFAULT_OPPORTUNITY_TIERS.map((t) => ({ ...t }));
  if (!stored?.length) return bases;

  const map = new Map<OpportunityTierKey, OpportunityTierDefinition>();
  for (const row of stored) {
    if (row && typeof row === "object" && row.key) {
      map.set(row.key as OpportunityTierKey, row as OpportunityTierDefinition);
    }
  }

  return bases.map((base) => {
    const s = map.get(base.key);
    if (!s) return base;

    const minValueSar = Math.max(0, Number(s.minValueSar ?? base.minValueSar) || 0);
    let maxValueSar: number | null;
    if (base.key === "mega") {
      maxValueSar =
        s.maxValueSar == null || Number.isNaN(Number(s.maxValueSar))
          ? null
          : Math.max(minValueSar, Number(s.maxValueSar));
    } else {
      const hi = s.maxValueSar != null ? Number(s.maxValueSar) : Number(base.maxValueSar);
      maxValueSar = Math.max(minValueSar, Number.isFinite(hi) ? hi : Number(base.maxValueSar));
    }

    return {
      ...base,
      ...s,
      key: base.key,
      labelKey: base.labelKey,
      strategicPurposeKey: base.strategicPurposeKey,
      classLabel:
        s.classLabel === "A" ||
        s.classLabel === "B" ||
        s.classLabel === "C" ||
        s.classLabel === "D"
          ? s.classLabel
          : base.classLabel,
      minValueSar,
      maxValueSar,
      cashFlowImpact: clamp01(s.cashFlowImpact, base.cashFlowImpact),
      growthImpact: clamp01(s.growthImpact, base.growthImpact),
      stabilityScore: clamp01(s.stabilityScore, base.stabilityScore),
      riskLevel: clampRisk(s.riskLevel, base.riskLevel),
      expectedSalesCycleDays: Math.max(
        1,
        Math.round(Number(s.expectedSalesCycleDays) || base.expectedSalesCycleDays)
      ),
      operationalComplexity: Math.min(
        5,
        Math.max(1, Math.round(Number(s.operationalComplexity) || base.operationalComplexity))
      ),
    };
  });
}

/** Mid-band hint for default ADV when seeding contribution cells for a new service. */
export function suggestedAdvFromTierBand(tier: OpportunityTierDefinition): number {
  const lo = Math.max(0, tier.minValueSar);
  if (tier.maxValueSar == null) {
    return Math.round(Math.max(lo + 1, lo * 1.15));
  }
  const hi = Math.max(lo, tier.maxValueSar);
  return Math.round((lo + hi) / 2);
}
