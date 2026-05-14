import type {
  CommercialPricingIntelligenceInput,
  CommercialPricingIntelligenceResult,
  CommercialPricingSensitivityRow,
  PricingModelSpec,
} from "./types";
import { applyPricingModel, describeModelPrimaryParam, patchModelPrimaryParam } from "./pricing-models";
import { resolveCommercialRisks } from "./commercial-risk";
import { buildMarginWarnings, computeCommercialMargins } from "./margin-analytics";

function sensitivityDeltas(model: PricingModelSpec): number[] {
  switch (model.modelId) {
    case "cost_plus":
    case "retainer_oriented":
    case "strategic_account":
      return [-10, -5, 0, 5, 10];
    case "value_based":
    case "market_penetration":
    case "premium_positioning":
      return [-0.12, -0.08, -0.04, 0, 0.04, 0.08, 0.12];
    default: {
      const _e: never = model;
      void _e;
      return [0];
    }
  }
}

function buildSensitivity(
  input: CommercialPricingIntelligenceInput,
  riskStack: number,
  scenarioMult: number
): CommercialPricingSensitivityRow[] {
  const { basis, model } = input;
  const { label, value } = describeModelPrimaryParam(model);
  return sensitivityDeltas(model).map((d) => {
    const next = value + d;
    const patched = patchModelPrimaryParam(model, next);
    const anchor = applyPricingModel(basis, patched).anchorPrice;
    const price = anchor * riskStack * scenarioMult;
    const margins = computeCommercialMargins(basis, price);
    return {
      label: `${label}: ${d >= 0 ? "+" : ""}${
        model.modelId === "cost_plus" || model.modelId === "retainer_oriented" || model.modelId === "strategic_account"
          ? `${d} pp`
          : d.toFixed(2)
      }`,
      adjustedPrimaryParam: String(next),
      suggestedPrice: price,
      grossMarginPct: margins.grossMarginPct,
      contributionMarginPct: margins.contributionMarginPct,
    };
  });
}

/**
 * Deterministic commercial pricing intelligence on top of **pre-computed** operational cost simulation.
 * Does not call HR or service stores — pass `OperationalPricingBasis` only.
 */
export function runCommercialPricingIntelligence(
  input: CommercialPricingIntelligenceInput
): CommercialPricingIntelligenceResult {
  const { basis, model, activeRiskIds, scenario, thresholds } = input;

  if (!Number.isFinite(basis.totalLoadedCost) || basis.totalLoadedCost < 0) {
    return { ok: false, errors: ["Invalid operational basis: totalLoadedCost"] };
  }

  const { anchorPrice, steps: modelBreakdown } = applyPricingModel(basis, model);
  const { modifiers, stack: riskStackMultiplier } = resolveCommercialRisks(activeRiskIds);
  const resolvedIds = new Set(modifiers.map((m) => m.id));
  const unresolvedRiskIds = activeRiskIds.filter((id) => !resolvedIds.has(id));
  const scenarioMult = Math.max(1e-9, scenario.priceMultiplier);
  const suggestedCommercialPrice = anchorPrice * riskStackMultiplier * scenarioMult;

  const margins = computeCommercialMargins(basis, suggestedCommercialPrice);
  const marginWarnings = buildMarginWarnings(margins, thresholds);
  const sensitivity = buildSensitivity(input, riskStackMultiplier, scenarioMult);

  const explanation: string[] = [
    "Commercial price is built only from simulated OH-loaded operational cost plus explicit model, risk, and scenario multipliers.",
    `Operational direct cost: ${basis.totalDirectCost.toFixed(2)}; OH-loaded cost: ${basis.totalLoadedCost.toFixed(2)} (currency ${basis.currency}).`,
    `Model anchor: ${anchorPrice.toFixed(2)}; risk stack ×${riskStackMultiplier.toFixed(4)}; scenario ×${scenarioMult.toFixed(4)}.`,
    ...modifiers.map((m) => `Risk — ${m.label}: ×${m.priceMultiplier.toFixed(3)} (${m.description})`),
    `Scenario — ${scenario.label}: ${scenario.competitivenessNote}`,
  ];

  return {
    ok: true,
    basis,
    model,
    modelBreakdown,
    riskStackMultiplier,
    activeRiskIds: [...activeRiskIds],
    scenario,
    suggestedCommercialPrice,
    margins,
    marginWarnings,
    sensitivity,
    explanation,
    unresolvedRiskIds,
  };
}
