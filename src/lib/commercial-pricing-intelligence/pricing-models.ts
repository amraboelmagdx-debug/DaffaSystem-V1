import type { CommercialPricingBreakdownStep, OperationalPricingBasis, PricingModelSpec } from "./types";

const EPS = 1e-9;

/**
 * Pure model step: converts OH-loaded operational cost into a **pre-risk / pre-scenario** commercial anchor.
 * Does not read HR stores — only `basis.totalLoadedCost`.
 */
export function applyPricingModel(
  basis: OperationalPricingBasis,
  model: PricingModelSpec
): { anchorPrice: number; steps: CommercialPricingBreakdownStep[] } {
  const L = Math.max(0, basis.totalLoadedCost);

  switch (model.modelId) {
    case "cost_plus": {
      const m = 1 + Math.max(0, model.markupPct) / 100;
      const anchor = L * m;
      return {
        anchorPrice: anchor,
        steps: [
          { key: "loaded", label: "OH-loaded operational cost", amount: L },
          { key: "markup", label: `Cost-plus markup (${model.markupPct}%)`, amount: anchor - L, factor: m },
        ],
      };
    }
    case "value_based": {
      const vm = Math.max(EPS, model.valueMultiplier);
      const anchor = L * vm;
      return {
        anchorPrice: anchor,
        steps: [
          { key: "loaded", label: "OH-loaded operational cost", amount: L },
          { key: "value", label: `Value-based multiplier (×${vm.toFixed(3)})`, amount: anchor - L, factor: vm },
        ],
      };
    }
    case "retainer_oriented": {
      const b = 1 + Math.max(0, model.coverageBufferPct) / 100;
      const anchor = L * b;
      return {
        anchorPrice: anchor,
        steps: [
          { key: "loaded", label: "OH-loaded operational cost", amount: L },
          { key: "retainer", label: `Retainer coverage buffer (${model.coverageBufferPct}%)`, amount: anchor - L, factor: b },
        ],
      };
    }
    case "strategic_account": {
      const base = 1 + Math.max(0, model.baseMarkupPct) / 100;
      const disc = Math.min(95, Math.max(0, model.relationshipDiscountPct)) / 100;
      const afterMarkup = L * base;
      const anchor = afterMarkup * (1 - disc);
      return {
        anchorPrice: anchor,
        steps: [
          { key: "loaded", label: "OH-loaded operational cost", amount: L },
          { key: "markup", label: `Strategic base markup (${model.baseMarkupPct}%)`, amount: afterMarkup - L, factor: base },
          {
            key: "discount",
            label: `Relationship discount (${model.relationshipDiscountPct}%)`,
            amount: anchor - afterMarkup,
            factor: 1 - disc,
          },
        ],
      };
    }
    case "market_penetration": {
      const m = Math.max(EPS, model.loadedToPriceMultiplier);
      const anchor = L * m;
      return {
        anchorPrice: anchor,
        steps: [
          { key: "loaded", label: "OH-loaded operational cost", amount: L },
          { key: "penetration", label: `Penetration price factor (×${m.toFixed(3)})`, amount: anchor - L, factor: m },
        ],
      };
    }
    case "premium_positioning": {
      const m = Math.max(EPS, model.loadedToPriceMultiplier);
      const anchor = L * m;
      return {
        anchorPrice: anchor,
        steps: [
          { key: "loaded", label: "OH-loaded operational cost", amount: L },
          { key: "premium", label: `Premium positioning factor (×${m.toFixed(3)})`, amount: anchor - L, factor: m },
        ],
      };
    }
    default: {
      const _exhaustive: never = model;
      void _exhaustive;
      return { anchorPrice: L, steps: [{ key: "loaded", label: "OH-loaded operational cost", amount: L }] };
    }
  }
}

/** For sensitivity sweeps — primary numeric field label + value string for UI. */
export function describeModelPrimaryParam(model: PricingModelSpec): { label: string; value: number } {
  switch (model.modelId) {
    case "cost_plus":
      return { label: "markupPct", value: model.markupPct };
    case "value_based":
      return { label: "valueMultiplier", value: model.valueMultiplier };
    case "retainer_oriented":
      return { label: "coverageBufferPct", value: model.coverageBufferPct };
    case "strategic_account":
      return { label: "baseMarkupPct", value: model.baseMarkupPct };
    case "market_penetration":
      return { label: "loadedToPriceMultiplier", value: model.loadedToPriceMultiplier };
    case "premium_positioning":
      return { label: "loadedToPriceMultiplier", value: model.loadedToPriceMultiplier };
    default: {
      const _e: never = model;
      void _e;
      return { label: "unknown", value: 0 };
    }
  }
}

export function patchModelPrimaryParam(model: PricingModelSpec, nextValue: number): PricingModelSpec {
  switch (model.modelId) {
    case "cost_plus":
      return { ...model, markupPct: nextValue };
    case "value_based":
      return { ...model, valueMultiplier: Math.max(EPS, nextValue) };
    case "retainer_oriented":
      return { ...model, coverageBufferPct: Math.max(0, nextValue) };
    case "strategic_account":
      return { ...model, baseMarkupPct: Math.max(0, nextValue) };
    case "market_penetration":
      return { ...model, loadedToPriceMultiplier: Math.max(EPS, nextValue) };
    case "premium_positioning":
      return { ...model, loadedToPriceMultiplier: Math.max(EPS, nextValue) };
    default: {
      const _e: never = model;
      void _e;
      return model;
    }
  }
}
