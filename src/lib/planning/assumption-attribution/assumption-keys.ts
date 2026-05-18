import type { AssumptionDriverCategory, AssumptionDriverId } from "@/types/scenario-attribution";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";

export type DriverSpec = {
  id: AssumptionDriverId;
  category: AssumptionDriverCategory;
  /** Apply compare value for this driver onto a copy of base bundle. */
  applyCompare: (base: ScenarioPlanningBundle, compare: ScenarioPlanningBundle) => ScenarioPlanningBundle;
  /** Whether base and compare differ for this driver. */
  changed: (base: ScenarioPlanningBundle, compare: ScenarioPlanningBundle) => boolean;
  baseValue: (base: ScenarioPlanningBundle) => number | string;
  compareValue: (compare: ScenarioPlanningBundle) => number | string;
};

function cloneBundle(b: ScenarioPlanningBundle): ScenarioPlanningBundle {
  return {
    ...b,
    scenario: { ...b.scenario },
    companyOverlay: { ...b.companyOverlay },
    tierLineOverrides: structuredClone(b.tierLineOverrides),
    governance: structuredClone(b.governance),
  };
}

function overlayField<K extends keyof ScenarioPlanningBundle["companyOverlay"]>(
  key: K
): Pick<DriverSpec, "applyCompare" | "changed" | "baseValue" | "compareValue"> {
  return {
    applyCompare: (base, compare) => {
      const next = cloneBundle(base);
      next.companyOverlay = { ...next.companyOverlay, [key]: compare.companyOverlay[key] };
      return next;
    },
    changed: (base, compare) => base.companyOverlay[key] !== compare.companyOverlay[key],
    baseValue: (base) => Number(base.companyOverlay[key] ?? 0),
    compareValue: (compare) => Number(compare.companyOverlay[key] ?? 0),
  };
}

function leverField<K extends keyof ScenarioPlanningBundle["scenario"]>(
  key: K
): Pick<DriverSpec, "applyCompare" | "changed" | "baseValue" | "compareValue"> {
  return {
    applyCompare: (base, compare) => {
      const next = cloneBundle(base);
      next.scenario = { ...next.scenario, [key]: compare.scenario[key] };
      return next;
    },
    changed: (base, compare) => base.scenario[key] !== compare.scenario[key],
    baseValue: (base) => Number(base.scenario[key] ?? 0),
    compareValue: (compare) => Number(compare.scenario[key] ?? 0),
  };
}

/** Fixed application order for documentation; marginals are independent counterfactuals. */
export const DRIVER_ORDER: AssumptionDriverId[] = [
  "overlay.revenueMonthly",
  "overlay.npTargetPct",
  "overlay.fixedCostsMonthly",
  "overlay.growthTargetPct",
  "overlay.marginTargetPct",
  "overlay.contributionMarginPct",
  "lever.growthAdj",
  "lever.conversionRateAdj",
  "lever.revenueMixAdj",
  "lever.fixedCostAdj",
  "lever.pipelineWeightAdj",
  "lever.npTargetPct",
  "workbook.tierOverrides",
];

export const DRIVER_SPECS: DriverSpec[] = [
  {
    id: "overlay.revenueMonthly",
    category: "growth",
    ...overlayField("revenueMonthly"),
  },
  {
    id: "overlay.npTargetPct",
    category: "margin",
    ...overlayField("npTargetPct"),
  },
  {
    id: "overlay.fixedCostsMonthly",
    category: "fixed_cost",
    ...overlayField("fixedCostsMonthly"),
  },
  {
    id: "overlay.growthTargetPct",
    category: "growth",
    ...overlayField("growthTargetPct"),
  },
  {
    id: "overlay.marginTargetPct",
    category: "margin",
    ...overlayField("marginTargetPct"),
  },
  {
    id: "overlay.contributionMarginPct",
    category: "margin",
    ...overlayField("contributionMarginPct"),
  },
  {
    id: "lever.growthAdj",
    category: "growth",
    ...leverField("growthAdj"),
  },
  {
    id: "lever.conversionRateAdj",
    category: "utilization",
    ...leverField("conversionRateAdj"),
  },
  {
    id: "lever.revenueMixAdj",
    category: "pricing",
    ...leverField("revenueMixAdj"),
  },
  {
    id: "lever.fixedCostAdj",
    category: "staffing",
    ...leverField("fixedCostAdj"),
  },
  {
    id: "lever.pipelineWeightAdj",
    category: "pipeline",
    ...leverField("pipelineWeightAdj"),
  },
  {
    id: "lever.npTargetPct",
    category: "margin",
    ...leverField("npTargetPct"),
  },
  {
    id: "workbook.tierOverrides",
    category: "workbook",
    applyCompare: (base, compare) => {
      const next = cloneBundle(base);
      next.tierLineOverrides = structuredClone(compare.tierLineOverrides);
      return next;
    },
    changed: (base, compare) =>
      JSON.stringify(base.tierLineOverrides) !== JSON.stringify(compare.tierLineOverrides),
    baseValue: (base) => Object.keys(base.tierLineOverrides).length,
    compareValue: (compare) => Object.keys(compare.tierLineOverrides).length,
  },
];

export function getChangedDrivers(
  baseBundle: ScenarioPlanningBundle,
  compareBundle: ScenarioPlanningBundle
): DriverSpec[] {
  const base = mergeGovernanceOnHydrate(baseBundle);
  const compare = mergeGovernanceOnHydrate(compareBundle);
  return DRIVER_SPECS.filter((d) => d.changed(base, compare));
}
