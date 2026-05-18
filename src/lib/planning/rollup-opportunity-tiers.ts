import type { ServiceTemplate } from "@/types/service-architecture";
import type { OpportunityTierKey } from "@/types/sales-plan";
import { mean, median } from "@/lib/incentives/tier-stats";

const TIER_KEYS: OpportunityTierKey[] = ["tiny", "standard", "big", "mega"];

export type TierRollupRow = {
  tierKey: OpportunityTierKey;
  activeInCatalog: boolean;
  median: number;
  mean: number;
  minComputed: number;
  maxComputed: number;
  sampleCount: number;
};

type WizardCellLike = { avgDealValueSar: number; exists?: boolean };

function valuesForTier(
  tierKey: OpportunityTierKey,
  products: { id: string; serviceTemplateId?: string | null }[],
  templatesById: Map<string, ServiceTemplate>,
  wizardCells: Record<string, WizardCellLike>
): number[] {
  const values: number[] = [];
  for (const p of products) {
    const cell = wizardCells[`${p.id}:${tierKey}`];
    if (cell?.exists !== false && cell?.avgDealValueSar > 0) {
      values.push(cell.avgDealValueSar);
    }
    const tplId = p.serviceTemplateId;
    if (!tplId) continue;
    const tpl = templatesById.get(tplId);
    const band = tpl?.opportunityTierBands?.find((b) => b.tierKey === tierKey);
    if (band?.active && band.avgDealValueSar != null && band.avgDealValueSar > 0) {
      values.push(band.avgDealValueSar);
    }
  }
  return values;
}

function bandBoundsForTier(
  tierKey: OpportunityTierKey,
  templates: ServiceTemplate[]
): { min: number; max: number } | null {
  const mins: number[] = [];
  const maxs: number[] = [];
  for (const tpl of templates) {
    const band = tpl.opportunityTierBands?.find((b) => b.tierKey === tierKey && b.active);
    if (!band) continue;
    if (band.minValueSar != null) mins.push(band.minValueSar);
    if (band.minSellingPriceSar != null) mins.push(band.minSellingPriceSar);
    if (band.maxValueSar != null) maxs.push(band.maxValueSar);
  }
  if (!mins.length && !maxs.length) return null;
  return {
    min: mins.length ? Math.min(...mins) : 0,
    max: maxs.length ? Math.max(...maxs) : 0,
  };
}

export function rollupOpportunityTiers(input: {
  templates: ServiceTemplate[];
  hrBusinessUnitId: string;
  products: { id: string; serviceTemplateId?: string | null }[];
  wizardCells: Record<string, WizardCellLike>;
}): TierRollupRow[] {
  const scopedTemplates = input.templates.filter(
    (t) => t.businessUnitId === input.hrBusinessUnitId
  );
  const templatesById = new Map(scopedTemplates.map((t) => [t.id, t]));

  return TIER_KEYS.map((tierKey) => {
    const values = valuesForTier(tierKey, input.products, templatesById, input.wizardCells);
    const activeInCatalog = scopedTemplates.some((tpl) =>
      tpl.opportunityTierBands?.some((b) => b.tierKey === tierKey && b.active)
    );
    const bounds = bandBoundsForTier(tierKey, scopedTemplates);
    const sorted = [...values].sort((a, b) => a - b);
    return {
      tierKey,
      activeInCatalog,
      median: median(values),
      mean: mean(values),
      minComputed: sorted.length ? sorted[0]! : (bounds?.min ?? 0),
      maxComputed: sorted.length ? sorted[sorted.length - 1]! : (bounds?.max ?? 0),
      sampleCount: values.length,
    };
  });
}
