# Commercial Pricing Intelligence — Architecture

This document describes the **Commercial Pricing Intelligence** layer: how it relates to operational cost simulation, HR economics, and a **future** Sales Calculator module. It is **not** a quotation system, CRM, invoicing, or ERP.

---

## What this layer **is**

- **Deterministic pricing simulation** that starts from **pre-computed** operational economics (`OperationalPricingBasis` — derived only from `simulateServiceDeliveryCost` success + currency).
- **Pricing models** that map **OH-loaded operational cost** to a **commercial anchor** (cost-plus, value-based, retainer buffer, strategic account, penetration, premium).
- **Commercial risk presets** and **commercial scenario presets** as transparent **price multipliers** (after the model, never inside HR or operational engines).
- **Margin intelligence**: gross margin (vs direct operational cost), contribution margin (vs OH-loaded operational cost), OH share of price, configurable **warnings** (not approvals).
- **Sensitivity sweeps** on each model’s primary numeric parameter.
- **Sales Calculator readiness** via `toCommercialPricingSnapshot` — stable ids, model id, scenario id, headline price and margins.

---

## What this layer **is not**

- Not **proposal / quote generation**, PDFs, line-item quotes, or customer-facing offers.
- Not **CRM**, pipeline stage pricing, or discount approval workflows.
- Not **accounting truth**, revenue recognition, or tax.
- Not **allocation** or **forecasting** engines.

---

## Layer separation (strict)

| Layer | Responsibility |
|-------|----------------|
| **Operational cost simulation** | HR-derived hourly economics, phases, allocations, OH-loaded **cost**. |
| **Commercial pricing intelligence** (this) | Models, commercial risks, scenarios, margins, sensitivity on top of **basis** only. |
| **Future Sales Calculator** | Quantity, packaging, customer-specific rules, outputs to proposals — **separate module**. |

Operational math is **never** modified by commercial code paths. Commercial code **only** reads `OperationalPricingBasis`.

---

## Key files

| Path | Purpose |
|------|---------|
| `src/lib/commercial-pricing-intelligence/types.ts` | Basis, models, risks, scenarios, results, calculator snapshot |
| `operational-basis.ts` | `operationalPricingBasisFromSimulation` |
| `pricing-models.ts` | `applyPricingModel`, primary param patch/sweep helpers |
| `commercial-risk.ts` | `COMMERCIAL_RISK_PRESETS`, `resolveCommercialRisks` |
| `commercial-pricing-scenarios.ts` | `COMMERCIAL_PRICING_SCENARIO_PRESETS` |
| `model-comparison-defaults.ts` | Default params for six-model comparison table |
| `margin-analytics.ts` | Margin math + warnings |
| `engine.ts` | `runCommercialPricingIntelligence` |
| `import-pricing-presets.ts` | Preview-first preset row merge |
| `sales-calculator-adapter.ts` | `toCommercialPricingSnapshot` |
| `src/stores/use-commercial-pricing-prefs-store.ts` | Persisted model, risks, scenario, thresholds |
| `commercial-pricing-intelligence-view.tsx` | Dashboard (uses cost sim + this engine) |

---

## Formulas (summary)

1. **Model anchor**  
   `anchorPrice = f_model(totalLoadedCost, modelParams)`  
   (see `applyPricingModel` — each model documents its own steps.)

2. **Commercial stack**  
   `suggestedPrice = anchorPrice × Π(risk.priceMultiplier) × scenario.priceMultiplier`

3. **Margins**  
   - `grossMarginPct = (price − totalDirectCost) / price × 100`  
   - `contributionMarginPct = (price − totalLoadedCost) / price × 100`  
   - OH and direct **shares of price** for sensitivity storytelling.

4. **Implicit wrap** from operational simulation is already inside `totalLoadedCost` when present — commercial layer does not re-open operational engines.

---

## Business unit isolation

- BU enforcement happens in **operational** simulation (role vs template BU).  
- Commercial basis carries `businessUnitId` for traceability and future calculator filters; pricing math does not re-resolve HR rows.

---

## Import / export

- `buildCommercialPricingPresetImportPreview` validates a single row-shaped preset (model id, optional JSON params, CSV risk ids, scenario id, optional threshold numbers).  
- **Preview-first**, normalization-safe; does not touch catalog entities.

---

## Limitations

- **No quantity, contract length, or payment terms** — future Sales Calculator owns those dimensions.
- **Family economics** sample in the dashboard is a **heuristic** (first linked tier per template, fixed cost-plus for averaging) for relative insight, not a reporting standard.
- **Equal deliverable splits** remain an operational simulation convention; commercial layer does not re-split.

---

## Future Sales Calculator

Expected to call, in order:

1. Operational cost simulation → `ServiceCostSimulationSuccess`  
2. `operationalPricingBasisFromSimulation`  
3. `runCommercialPricingIntelligence` (or equivalent server-side port)  
4. `toCommercialPricingSnapshot` for persistence / handoff  

The calculator may add quantity, discounts, and packaging **without** changing the contracts above.
