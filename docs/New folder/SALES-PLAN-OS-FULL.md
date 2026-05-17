# Sales Plan OS — Full implementation record

**Last updated:** 2026-05-12  
**Repository:** CRM-Dashboard (Enterprise Forecast Platform)  
**Purpose:** This document is the **single markdown reference** for everything implemented under **Sales Plan OS** (structured revenue planning aligned with the existing workbook / planning engine), including types, domain logic, UI, i18n, tests, and polish passes.

---

## Table of contents

1. [Product intent](#1-product-intent)  
2. [How to run the app](#2-how-to-run-the-app)  
3. [Architecture overview](#3-architecture-overview)  
4. [File map](#4-file-map)  
5. [Domain model & types](#5-domain-model--types)  
6. [Calculation engine](#6-calculation-engine)  
7. [Central analytics: `buildSalesPlanModel`](#7-central-analytics-buildsalesplanmodel)  
8. [Wizard UI (18 steps)](#8-wizard-ui-18-steps)  
9. [Charts](#9-charts)  
10. [State & persistence](#10-state--persistence)  
11. [Workspace integration](#11-workspace-integration)  
12. [Internationalization](#12-internationalization)  
13. [Navigation & discovery](#13-navigation--discovery)  
14. [Tests](#14-tests)  
15. [Quality passes & fixes](#15-quality-passes--fixes)  
16. [Known limitations](#16-known-limitations)  
17. [Related docs](#17-related-docs)

---

## 1. Product intent

**Sales Plan OS** is a guided, multi-step **sales / revenue planning wizard** that:

- Captures **portfolio context**, **opportunity tiers**, **fixed costs**, **products/services**, **tier economics** (ADV, CM, delivery), **revenue shares**, **tier mix**, **NP target**, **conversion funnel**, **quarterly weights**, and **market segments**.
- Computes **targets** (aligned with the existing planning workbook concepts: break-even, sales target, NP at target, ROI).
- Produces **operational rollups** (revenue, contribution, variable + delivery cost, awards, profit after pro-rata fixed allocation).
- Surfaces **insights** (share drift, segment drift, tier mix, mega concentration, Q4 load, NP feasibility, min-deal floor, capacity stress).
- Exposes **capacity** heuristics (load index, baseline, utilization %, pressure band).
- Renders **Recharts** dashboards from a single **`SalesPlanModel`** object.
- Stays **compatible with the current app**: it extends the demo workspace and planning vocabulary rather than replacing `domain.ts` or the workbook engine wholesale.

---

## 2. How to run the app

From the project root:

```bash
npm install
npm run dev
```

- The dev script (`package.json`) runs **Next.js with Webpack** on port **3001** by default (`next dev -p 3001`). This avoids **Windows error 1450** (“Insufficient system resources”) that some machines hit when **Turbopack** reads large `.map` files under `node_modules`.
- Optional faster dev (if your PC handles it): `npm run dev:turbo` → `next dev --turbopack -p 3001`.
- If you see **`EADDRINUSE`**, pick a free port, e.g. `npx next dev -p 3010`.
- Open the Sales Plan wizard (replace `PORT` with `3001` or whatever you chose):
  - **English:** `http://localhost:PORT/en/sales-plan`
  - **Arabic (RTL):** `http://localhost:PORT/ar/sales-plan`

Other useful commands:

| Command | Purpose |
|--------|---------|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run lint` | Next.js ESLint |
| `npm run build` | Production build (see [Known limitations](#16-known-limitations) if the worker crashes on Windows) |

---

## 3. Architecture overview

```text
User input (Zustand: useSalesPlanWizardStore)
        │
        ▼
buildSalesPlanModel(input)  ← single derived model
        │
        ├── targets (computeTargetsFromPlan)
        ├── annual revenue, portfolio ADV, awards, funnel, quarterly ops
        ├── tierRollups, serviceRollups, segmentRevenue
        ├── insights[], capacity{}, charts{}
        └── diagnostics: shareSumRaw, segmentSumRaw, megaPortfolioShare, q4Weight
        │
        ▼
SalesPlanWizard + SalesPlanCharts (Recharts)
```

**Design principle:** The wizard reads **`model`** from `buildSalesPlanModel` for analytics, tables, charts, and **portfolio ADV** (no duplicate ADV path that could drift from the model).

---

## 4. File map

| Area | Path |
|------|------|
| **Route** | `src/app/[locale]/(dashboard)/sales-plan/page.tsx` |
| **Wizard shell** | `src/components/sales-plan/sales-plan-wizard.tsx` |
| **Charts** | `src/components/sales-plan/sales-plan-charts.tsx` |
| **Model builder** | `src/lib/sales-plan/build-model.ts` |
| **Model tests** | `src/lib/sales-plan/build-model.test.ts` |
| **Core formulas** | `src/lib/sales-plan/engine.ts` |
| **Engine tests** | `src/lib/sales-plan/engine.test.ts` |
| **Per-service ADV from tier mix** | `src/lib/sales-plan/weighted-adv.ts` |
| **Wizard store** | `src/stores/use-sales-plan-wizard-store.ts` |
| **Shared types** | `src/types/sales-plan.ts` |
| **Default tier definitions** | `src/data/opportunity-tiers-defaults.ts` |
| **Nav + command palette** | `src/components/layout/app-shell.tsx`, `src/components/command-menu.tsx` |
| **Strings** | `messages/en.json`, `messages/ar.json` (`salesPlan` namespace) |

---

## 5. Domain model & types

Defined in `src/types/sales-plan.ts` (high level):

- **`OpportunityTierKey`:** `tiny` | `standard` | `big` | `mega`
- **`OpportunityTierDefinition`:** band, class, strategic purpose keys, risk, cycle days, complexity, etc.
- **`SalesPlanMeta`:** portfolio name, year, currency, scenario label
- **`FixedCostLine` / `FixedCostCategoryKey`:** categorized monthly/yearly fixed lines
- **`ProductServiceLine`:** name, category, `deliveryType`, strategic importance, operational complexity, scalability
- **`ContributionCell`:** per `(serviceId, tierKey)` — exists, ADV, CM%, delivery cost, sales cycle
- **`ConversionRates`**, **`QuarterlyWeights`**, **`MarketSegmentShare`**
- Defaults: **`DEFAULT_CONVERSION_RATES`**, **`DEFAULT_QUARTERLY_WEIGHTS`**

---

## 6. Calculation engine

`src/lib/sales-plan/engine.ts` (used by both the workbook-aligned flows and Sales Plan OS):

- **Fixed burn / targets:** `sumMonthlyFixedCosts`, `yearlyBurnFromMonthly`, `breakEvenRevenue`, `computeTargetsFromPlan` (and related workbook-style outputs).
- **Portfolio composition:** `weightedBlendedCm`, `weightedPortfolioAdv`
- **Awards & funnel:** `requiredAwardsFromRevenue`, `funnelVolumesFromAwards`
- **Quarterly operational targets:** `quarterlyOperationalTargets`

`src/lib/sales-plan/weighted-adv.ts`:

- **`weightedAdvForService`:** derives a **service-level ADV** from enabled tiers and normalized tier mix (used in service rollups and funnel back-solve per service).

---

## 7. Central analytics: `buildSalesPlanModel`

**File:** `src/lib/sales-plan/build-model.ts`  
**Export:** `buildSalesPlanModel(input: BuildSalesPlanModelInput): SalesPlanModel`

### Outputs (`SalesPlanModel`)

| Field | Role |
|-------|------|
| `targets` | Result of `computeTargetsFromPlan` (monthly sales target, break-even, NP at target, ROI, etc.) |
| `annualRevenueSar` | `targets.salesTarget * 12` |
| `portfolioAdv` | Weighted portfolio average deal value |
| `awardAnnual` | Annual contract count from revenue ÷ ADV (with min-deal floor semantics) |
| `funnelGlobal` | Funnel volumes from annual awards × conversion chain |
| `quarterlyOps` | Per-quarter revenue and funnel counts from quarterly weights |
| `tierRollups` | Per service × tier: revenue, contribution, variable+delivery cost, awards, profit after allocated fixed |
| `serviceRollups` | Per service: revenue, awards, per-service funnel |
| `segmentRevenue` | Annual revenue allocated by normalized segment weights |
| `insights` | List of `{ id: PlanningInsightId, severity }` |
| `capacity` | `loadIndex`, `baselineCapacity`, `utilizationPct`, `pressure` |
| `charts` | Series for Recharts (tiers, services, quarterly, funnel) |
| `shareSumRaw`, `segmentSumRaw` | Raw sum checks for UX / insights |
| `megaPortfolioShare` | Portfolio-level mega tier exposure |
| `q4Weight` | Q4 share of annual weight |

### Insight IDs (`PlanningInsightId`)

All of these have matching keys under `salesPlan.insights.*` in **en** and **ar**:

- `serviceShareDrift`, `segmentShareDrift`, `tierMixDrift`
- `megaDependency`, `quarterOverload`
- `npUnreachable` (critical)
- `minDealFloor` (info)
- `capacitySevere` (critical), `capacityPressure` (warning)

---

## 8. Wizard UI (18 steps)

**File:** `src/components/sales-plan/sales-plan-wizard.tsx`  
**Step titles** (from `messages/*/salesPlan.stepTitles`):

| Step | Key | Focus |
|------|-----|--------|
| 1 | `s1` | Create sales plan (meta, year, currency) |
| 2 | `s2` | Opportunity tiers |
| 3 | `s3` | Fixed costs |
| 4 | `s4` | Products & services (delivery type, sliders, motion) |
| 5 | `s5` | Average deal values |
| 6 | `s6` | Revenue distribution across services |
| 7 | `s7` | Tier mix per service |
| 8 | `s8` | Contribution margin matrix |
| 9 | `s9` | Break-even & targets (KPI strip tied to `model`) |
| 10 | `s10` | Operational rollups — tier table, portfolio totals, mega share |
| 11 | `s11` | Market segmentation + segment revenue allocation |
| 12 | `s12` | Conversion engine + global funnel + per-service funnel table |
| 13 | `s13` | Award requirements summary |
| 14 | `s14` | Quarterly planning table (editable weights; uses `model.portfolioAdv` for per-quarter awards) |
| 15 | `s15` | Dashboard preview — **`SalesPlanCharts`** |
| 16 | `s16` | Advanced insights list (severity badges) |
| 17 | `s17` | Capacity panel + utilization bar |
| 18 | `s18` | Enterprise UX checklist |

### Header actions (global)

- **Apply to workspace:** pushes `fixedCostsMonthly` and `npTargetPct` into the selected demo company (`useWorkspaceStore`).
- **Normalize segments:** 25% each segment.
- **Normalize tier mixes:** renormalize per service over **enabled** tiers only.
- **Reset:** restores wizard initial state.

---

## 9. Charts

**File:** `src/components/sales-plan/sales-plan-charts.tsx`  
**Library:** Recharts  

Charts consume **`model.charts`** (`ChartSeries`):

- Revenue by **tier** (color per tier via CSS chart variables)
- Revenue by **service** (horizontal bar)
- **Quarterly** revenue line (tooltip shows revenue + `charts.revAxis` label)
- **Funnel** bar chart — tooltip formats counts with `toLocaleString(locale)` and **`charts.funnelSeries`**

---

## 10. State & persistence

**File:** `src/stores/use-sales-plan-wizard-store.ts`

- **Zustand** + **`persist`** middleware.
- **Storage key:** `efp-sales-plan-wizard`
- **Partialized state:** step, meta, tiers, fixed lines, products, shares, tier mix, contribution cells, conversion rates, quarterly weights, segments, blended CM override, NP target.

Initial seeding includes default contribution matrix, default tier mix, equal service shares when products change, and default market segments.

---

## 11. Workspace integration

**`applyPlanToWorkspace`** (in the wizard store):

- Reads `sumMonthlyFixedCosts` from the wizard’s fixed cost lines.
- Calls `useWorkspaceStore.getState().updateCompany(...)` for the selected (or first) company:
  - `fixedCostsMonthly`
  - `npTargetPct`

This keeps the **demo workspace** planning inputs in sync with the Sales Plan wizard without introducing a second database path.

---

## 12. Internationalization

- **Library:** `next-intl`
- **Namespaces:** large `salesPlan` tree in:
  - `messages/en.json`
  - `messages/ar.json`
- **Coverage:** step titles, operational labels, conversion labels, segments, tier names/purpose, fixed categories, KPI strip, rollout table columns, insights, capacity, charts (including `tierShort`, `funnelLabels`, `charts.funnelSeries`), product field labels, normalize/apply copy, roadmap / checklist strings.

Arabic strings were brought to **parity** with the main English additions (product block, segment allocation, insights clear message, chart funnel series label).

---

## 13. Navigation & discovery

- **Sidebar:** `app-shell.tsx` — item for `/sales-plan` with active path matching `pathname.startsWith("/sales-plan")`.
- **Command palette:** `command-menu.tsx` — entry with `Target` icon and `salesPlan` label key for quick navigation.

---

## 14. Tests

| File | What it covers |
|------|----------------|
| `src/lib/sales-plan/engine.test.ts` | Core engine invariants |
| `src/lib/sales-plan/build-model.test.ts` | Share drift behavior; tier revenue sum vs annual target |
| `src/lib/planning/workbook-engine.test.ts` | Existing workbook engine (regression guard for planning domain) |

Run: `npm run test` (Vitest).

---

## 15. Quality passes & fixes

Recent hardening (through 2026-05-12):

1. **TypeScript:** Added missing **`useMemo`** import from React; removed duplicate **`portfolioAdv`** memo — wizard uses **`model.portfolioAdv`** everywhere it must stay aligned with `buildSalesPlanModel`.
2. **Strict typings:** `PlanningInsightId` union on model insights; explicit types for table row maps (`TierRollupRow`, `ServiceRollup`, `PlanningInsight`, segment revenue row derived from `SalesPlanModel`).
3. **i18n typing:** `InsightTranslationKey` template union for `t(\`insights.${id}\`)`.
4. **UI:** New **`destructive`** `Badge` variant for critical insight severity; warnings/info use `warning` / `secondary`.
5. **Charts:** Funnel chart tooltip formatter + **`charts.funnelSeries`** in EN/AR.
6. **Constants:** `WIZARD_STEP_TITLE_KEYS` as module-level `as const` for step pills (no redundant `useMemo`).
7. **JSON:** Validated `messages/en.json` and `messages/ar.json` parse cleanly.

---

## 16. Known limitations

1. **Production `next build` on some Windows setups** may fail during the lint/type phase with a worker exit (e.g. `spawn UNKNOWN` or non-zero worker code) even when **`npm run typecheck`** passes. Treat **`tsc`** + **`vitest`** as the source of truth for CI until the Next worker issue is resolved or ESLint is run separately.
2. **Quarterly awards in step 14** recompute via `requiredAwardsFromRevenue(row.revenueSar, model.portfolioAdv)` for the table display; the **canonical** quarterly funnel numbers remain on `model.quarterlyOps` — a future refinement could read award counts only from the model to avoid any edge-case divergence.
3. **Supabase:** Sales Plan OS is fully functional in **demo / local** mode; persistent multi-user storage for wizard state is not part of this slice (local persistence only via `localStorage` through Zustand).

---

## 17. Related docs

- [`docs/PROJECT-COMPLETED-SO-FAR.md`](./PROJECT-COMPLETED-SO-FAR.md) — broader platform status (Arabic overview + stack table).
- [`docs/ZAN-AMD-workbook-analysis.md`](./ZAN-AMD-workbook-analysis.md) — analytical notes on the original Excel workbook.

---

*End of document.*
