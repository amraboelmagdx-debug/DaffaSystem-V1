import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import type { DemoCompany } from "@/types/domain";
import type { TierLine } from "@/lib/planning/workbook-engine";

/** Merge anchor company row with scenario-isolated financial overlay. */
export function resolveEffectiveCompany(
  base: DemoCompany,
  bundle: ScenarioPlanningBundle
): DemoCompany {
  return {
    ...base,
    ...bundle.companyOverlay,
    opportunityTiers: bundle.companyOverlay.opportunityTiers?.map((t) => ({ ...t })),
  };
}

export function resolveEffectiveTierLines(
  bundle: ScenarioPlanningBundle
): Record<string, TierLine[]> {
  const out: Record<string, TierLine[]> = {};
  for (const [streamId, lines] of Object.entries(bundle.tierLineOverrides)) {
    out[streamId] = lines.map((l) => ({ ...l }));
  }
  return out;
}
