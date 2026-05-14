import type { ServiceCatalogSelection } from "@/lib/service-architecture/sales-plan-bridge";

/** Snapshot of operational economics — only from cost simulation, never mixed with commercial rules. */
export interface OperationalPricingBasis {
  businessUnitId: string;
  serviceTemplateId: string;
  serviceTierId: string;
  templateCode: string;
  tierCode: string;
  templateName: string;
  tierName: string;
  currency: string;
  totalDirectCost: number;
  totalLoadedCost: number;
  totalOhContribution: number;
  totalEffectiveHours: number;
}

export type PricingModelId =
  | "cost_plus"
  | "value_based"
  | "retainer_oriented"
  | "strategic_account"
  | "market_penetration"
  | "premium_positioning";

export type PricingModelSpec =
  | { modelId: "cost_plus"; markupPct: number }
  | { modelId: "value_based"; valueMultiplier: number }
  | { modelId: "retainer_oriented"; coverageBufferPct: number }
  | { modelId: "strategic_account"; baseMarkupPct: number; relationshipDiscountPct: number }
  | { modelId: "market_penetration"; loadedToPriceMultiplier: number }
  | { modelId: "premium_positioning"; loadedToPriceMultiplier: number };

export interface CommercialRiskModifier {
  id: string;
  label: string;
  description: string;
  /** Multiplies recommended price after the pricing model (transparent commercial stress). */
  priceMultiplier: number;
  /** Optional stress on margin narrative (does not change math unless wired). */
  marginStressNote?: string;
}

export interface CommercialPricingScenarioModifier {
  id: string;
  label: string;
  description: string;
  priceMultiplier: number;
  /** Shown in UI — competitiveness / positioning intent. */
  competitivenessNote: string;
}

export interface CommercialMarginThresholds {
  /** Warn when gross margin % falls below this (price vs direct cost). */
  minGrossMarginPct: number;
  /** Warn when contribution margin % falls below this (price vs loaded operational cost). */
  minContributionMarginPct: number;
  /** “Safety” floor on contribution margin for hard warning. */
  pricingSafetyContributionMarginPct: number;
}

export interface CommercialPricingBreakdownStep {
  key: string;
  label: string;
  amount: number;
  /** Multiplier applied at this step, if any (for explainability). */
  factor?: number;
}

export interface CommercialMarginBlock {
  grossMarginPct: number;
  contributionMarginPct: number;
  /** loaded operational cost / suggested price */
  loadedCostRatio: number;
  /** OH dollars / suggested price */
  ohShareOfPricePct: number;
  /** direct cost / suggested price */
  directCostShareOfPricePct: number;
}

export interface CommercialPricingSensitivityRow {
  label: string;
  adjustedPrimaryParam: string;
  suggestedPrice: number;
  grossMarginPct: number;
  contributionMarginPct: number;
}

export interface CommercialPricingIntelligenceSuccess {
  ok: true;
  basis: OperationalPricingBasis;
  model: PricingModelSpec;
  /** Ordered explainability steps before risks/scenario. */
  modelBreakdown: CommercialPricingBreakdownStep[];
  /** Cumulative product of selected risk price multipliers. */
  riskStackMultiplier: number;
  activeRiskIds: string[];
  scenario: CommercialPricingScenarioModifier;
  /** After model × risks × scenario. */
  suggestedCommercialPrice: number;
  margins: CommercialMarginBlock;
  marginWarnings: string[];
  /** ±% sweeps on the active model’s primary numeric knob. */
  sensitivity: CommercialPricingSensitivityRow[];
  /** Narrative lines for dashboard “why”. */
  explanation: string[];
  /** Risk ids from input that did not match a preset (ignored in math). */
  unresolvedRiskIds: string[];
}

export interface CommercialPricingIntelligenceFailure {
  ok: false;
  errors: string[];
}

export type CommercialPricingIntelligenceResult =
  | CommercialPricingIntelligenceSuccess
  | CommercialPricingIntelligenceFailure;

export interface CommercialPricingIntelligenceInput {
  basis: OperationalPricingBasis;
  model: PricingModelSpec;
  /** Selected risk ids; resolved against known preset list in engine. */
  activeRiskIds: string[];
  scenario: CommercialPricingScenarioModifier;
  thresholds: CommercialMarginThresholds;
}

/** Future Sales Calculator module — stable handoff, no quotation fields. */
export interface CommercialPricingSnapshot {
  selection: ServiceCatalogSelection;
  computedAt: string;
  modelId: PricingModelId;
  suggestedCommercialPrice: number;
  currency: string;
  margins: Pick<CommercialMarginBlock, "grossMarginPct" | "contributionMarginPct">;
  activeRiskIds: string[];
  scenarioId: string;
}
