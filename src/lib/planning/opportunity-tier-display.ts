/**
 * Workbook/settings display tiers derived from canonical Sales Plan opportunity tiers.
 * Incentive rules and Sales Plan OS must use OpportunityTierDefinition — not legacy demo bands.
 */

import type { OpportunityTierDefinition, OpportunityTierKey } from "@/types/sales-plan";
import { DEFAULT_OPPORTUNITY_TIERS } from "@/data/opportunity-tiers-defaults";
import { mergeOpportunityTiersWithDefaults } from "@/data/opportunity-tiers-defaults";
import type { DemoCompany } from "@/types/domain";

export type WorkbookDisplayTier = {
  key: OpportunityTierKey;
  label: string;
  min: number;
  max: number | null;
  avg: number;
  margin: number;
  prob: number;
};

function labelFromKey(key: OpportunityTierKey): string {
  const map: Record<OpportunityTierKey, string> = {
    tiny: "Tiny",
    standard: "Standard",
    big: "Big",
    mega: "Mega",
  };
  return map[key];
}

function midpoint(def: OpportunityTierDefinition): number {
  const max = def.maxValueSar ?? def.minValueSar * 2;
  return Math.round((def.minValueSar + max) / 2);
}

/** Map canonical SAR tiers to legacy settings-table shape (SAR bands, not workbook demo bands). */
export function workbookDisplayTiersFromDefinitions(
  tiers: OpportunityTierDefinition[]
): WorkbookDisplayTier[] {
  const probs: Record<OpportunityTierKey, number> = {
    tiny: 0.35,
    standard: 0.28,
    big: 0.2,
    mega: 0.12,
  };
  return tiers.map((def) => ({
    key: def.key,
    label: labelFromKey(def.key),
    min: def.minValueSar,
    max: def.maxValueSar,
    avg: midpoint(def),
    margin: 0.28 + def.operationalComplexity * 0.04,
    prob: probs[def.key],
  }));
}

export function workbookDisplayTiersForCompany(
  company?: Pick<DemoCompany, "opportunityTiers"> | null
): WorkbookDisplayTier[] {
  const merged = mergeOpportunityTiersWithDefaults(company?.opportunityTiers);
  return workbookDisplayTiersFromDefinitions(merged);
}

export function resolveOpportunityTierKey(
  dealValueSar: number,
  tiers: OpportunityTierDefinition[] = DEFAULT_OPPORTUNITY_TIERS
): OpportunityTierKey {
  const sorted = [...tiers].sort((a, b) => a.minValueSar - b.minValueSar);
  for (const t of sorted) {
    const withinMax =
      t.maxValueSar === null || dealValueSar <= t.maxValueSar;
    if (dealValueSar >= t.minValueSar && withinMax) return t.key;
  }
  return sorted[sorted.length - 1]?.key ?? "standard";
}
