# Service Cost Simulation — Architecture

This document describes the **operational delivery cost simulation** layer. It is intentionally separate from commercial pricing, quotations, profitability optimization, allocation engines, forecasting, and ERP accounting.

---

## What this system **is**

- **Operational cost simulation** for a `ServiceTemplate` × `ServiceTier` path using persisted service architecture (phases, allocations, deliverables).
- **Workforce economics** driven by the same HR projection as dashboards: `deriveWorkspaceProjection` → `breakdownByRoleId` with **`standardHourlyCost`** (direct) and **`ohAdjustedHourlyCost`** (OH-loaded).
- **Transparent assumptions** (optional multipliers on simulated hours) and **scenario modifiers** (named presets that stack multiplicatively).
- **Phase-first costing**: totals are sums of phase blocks; nothing important is flattened to a single opaque number in the engine API.
- **Deliverable visibility**: equal split of a parent phase’s simulated hours and costs when multiple deliverables attach to the same `ServiceTemplateTierPhase` (documented convention).

---

## What this system **is not**

- Not **sell price**, margin, discounting, or quote generation.
- Not **official accounting** or payroll truth.
- Not **capacity allocation** across concurrent projects (no scheduling graph).
- Not **forecasting** time series (no periodized revenue/cash view here).

---

## Module layout (pure vs UI)

| Area | Path | Role |
|------|------|------|
| Types | `src/lib/service-cost-simulation/types.ts` | Inputs, outputs, assumptions, catalog slice |
| Defaults | `src/lib/service-cost-simulation/defaults.ts` | Neutral assumption baseline |
| Scenarios | `src/lib/service-cost-simulation/scenarios.ts` | Named modifier presets |
| Engine | `src/lib/service-cost-simulation/engine.ts` | `simulateServiceDeliveryCost` — deterministic, UI-free |
| HR wiring | `src/lib/service-cost-simulation/hr-input.ts` | `buildServiceCostSimulationInput`, `catalogSliceFromStore` |
| Assumption import | `src/lib/service-cost-simulation/cost-assumption-import.ts` | Preview-first merge for assumption rows |
| Sales Plan adapter | `src/lib/service-cost-simulation/sales-plan-cost-adapter.ts` | `toServiceCostBaselineSnapshot` — stable IDs + headline totals |
| Prefs (UI) | `src/stores/use-service-cost-simulation-prefs-store.ts` | Persisted assumptions + scenario id |
| Dashboard | `src/components/service-architecture/service-cost-intelligence-view.tsx` | Analytics surface only |

---

## Formulas (high level)

For each **role allocation** row on a **template-tier-phase**:

1. **Phase-type factor** (from phase **code**, case-insensitive substrings):  
   - If code contains `QA` → multiply by `qaSensitivityFactor`.  
   - If code contains `DES` or `DESIGN` → multiply by `designRevisionIntensityFactor`.  
   - If code contains `DEL` or `DELIVERY` → multiply by `clientReviewLagFactor`.

2. **Global assumption stack** (applies to all hours on the path):  
   `deliveryInefficiencyFactor × coordinationLoadFactor × managementLoadFactor`  
   (each clamped to a small epsilon floor to avoid zeroing).

3. **Scenario stack** (multiplicative):  
   `hoursMultiplier × effortMultiplier × coordinationMultiplier × managementMultiplier`.

4. **Effective hours**  
   `H_eff = H_base × phaseTypeFactor × assumptionStack × scenarioStack`

5. **Costs** (per line, using HR breakdown for that `jobRoleId`):  
   - `directCost = H_eff × standardHourlyCost`  
   - `loadedCost = H_eff × ohAdjustedHourlyCost`  
   - `ohContribution = loadedCost − directCost`

6. **Phase totals** — sum of lines in the phase (ordered via `getTemplateTierPhasesOrdered`).

7. **Implicit wrap** (optional, transparent lump after line items):  
   `implicitWrapLoadedCost = sum(loadedCost_lines) × implicitWrapLoadedCostFraction`  
   Added only to **loaded** and **OH contribution** totals (not direct), keeping “wrap” as overhead-like load.

### Business unit isolation

- If `jobRole.businessUnitId !== template.businessUnitId`, the line contributes **zero** cost and a **warning** is recorded (stable id preserved for audit).

### Missing HR data

- Missing or archived roles, or missing `breakdownByRoleId` entry → zero economics + warning.

---

## Sales Plan readiness

- Catalog references remain `ServiceCatalogSelection` (`serviceTemplateId`, `tierId`).
- `toServiceCostBaselineSnapshot` produces a small JSON-friendly object: ids, codes, timestamp, and **headline totals only** — no tight coupling to Sales Plan stores.

---

## Import / export (assumptions)

- **Export:** `exportAssumptionsToImportRows` → JSON array `{ assumptionKey, numericValue }`.
- **Import:** `buildServiceCostAssumptionImportPreview` validates keys against `ServiceCostAssumptions`, rejects unknown keys, bounds `implicitWrapLoadedCostFraction` to `[0, 1]`.
- **Service catalog** import (`buildServiceCatalogImportPlan`) remains unchanged; allocation/hour imports for catalog entities stay on the service-architecture import path. Assumption import is a **separate** pure helper to keep previews safe.

---

## Simulation limitations (explicit)

- **No utilization or calendar contention** — hours are nominal planning units, not scheduled FTE load.
- **No task / sub-phase** granularity under a phase (future extension point).
- **Duplicate `sortOrder`** on phases is allowed by the catalog model; ordering follows the selector’s stable sort — operational ambiguity should be cleaned in data.
- **Equal split** for multiple deliverables on one phase is a **convention**, not measured effort tracing.

---

## Future readiness

- **Allocation engines** can consume phase/role line outputs as coefficients or constraints.
- **Profitability** can layer price minus simulated loaded cost without changing this engine’s contracts.
- **Forecasting** can multiply simulated hours by demand drivers in a separate layer.

---

## Tests

Located under `src/lib/service-cost-simulation/*.test.ts` — phase costing, OH-loaded ordering, BU isolation, scenario deltas, assumption sensitivity on QA-coded phases, tier monotonicity on the stress catalog, deliverable split, and assumption import validation.
