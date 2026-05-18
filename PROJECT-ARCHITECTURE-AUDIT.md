# PROJECT ARCHITECTURE & IMPLEMENTATION AUDIT

**Document type:** Master engineering review + planning integrity audit  
**Scope:** Full-stack technical, product logic, and enterprise-readiness assessment  
**Repository:** CRM-Dashboard / Enterprise Forecast Platform  
**Audit date:** 2026-05-13  
**Auditor stance:** Brutally honest; evidence-based on current source tree (`src/` ≈ 68 TypeScript/TSX modules audited)

---

## How to read this document

- **Implemented** = code exists, is wired in UI or API, and performs a coherent function.  
- **Partial** = exists but incomplete, inconsistent with siblings, or not production-grade.  
- **Missing** = no meaningful implementation or only placeholders.  
- **Risk** = may cause bugs, drift, scaling pain, or rewrite cost later.

This is **not** a marketing document. Where the product behaves like an **advanced dashboard + planning demo**, it is stated explicitly.

---

# 1. Executive architecture summary

## 1.1 Current maturity level

| Layer | Maturity (1–5) | Notes |
|--------|----------------|--------|
| UI shell & navigation | 4 | App shell, command palette, i18n routes, RTL, theming |
| Executive dashboard | 3–4 | Rich charts, KPIs; logic split across engines |
| Planning workbook UI | 3 | Tier matrix, `computeWorkbookTargets`; tied to demo store |
| Sales Plan OS wizard | 3–4 | Deep wizard, `buildSalesPlanModel` SSOT, charts, insights |
| Scenario modelling | 2–3 | Heuristic `applyScenario` on simplified inputs |
| Pipeline / opportunities | 2 | Weighted pipeline; not full forecast engine |
| Persistence | 2 (demo) / 3 (if Supabase on) | Zustand `persist` + seed; Supabase path exists but not unified client model |
| Enterprise FP&A primitives | 1–2 | No dimension registry, no measure DAG, no actuals ledger |

**Overall:** strong **productized demo** with **real planning math fragments** aligned to a workbook narrative—not yet a multidimensional FP&A platform.

## 1.2 Overall architecture score (engineering)

**6.5 / 10** for a **seed-stage planning product** targeting enterprise narrative.  
**4 / 10** against a literal **Anaplan / Pigment / SAC** comparison.

**Why not higher**

- **Parallel financial engines** (`lib/calculations/engine.ts` vs `workbook-engine` + `sales-plan/engine`) without a single “measure ownership” layer.  
- **Client-only truth** for primary UX (Zustand + localStorage).  
- **No actuals**, **no snapshots**, **no collaborative audit**, **no role-based planning**.  
- **Sales Plan OS** and **Executive dashboard** can disagree on CM / targets because they compose inputs differently.

## 1.3 Current product direction

**Observed direction (from code):**

1. **Workbook-faithful CM / sales target / NP / ROI** via `workbook-engine` and `PlanningWorkbookPanel`.  
2. **Operationalization** via Sales Plan OS: tiers, funnel, quarterly ops, rollups, capacity heuristic, insights.  
3. **Optional “enterprise roadmap” UI** (`AdvancedEnterprisePanel`) explaining future FP&A layers without implementing them.

**Drift risk:** dashboard and scenarios still lean on **`runForecastEngine`** (P&L-style monthly snapshot) while Sales Plan uses **`computeWorkbookTargets`** path through `computeTargetsFromPlan`—same *family* of NP gap algebra but **not the same code path** for blended CM in all screens.

## 1.4 Major strengths

- **Clear workbook story** in `workbook-engine.ts` (documented D16-style blending, sales target from CM−NP gap).  
- **`buildSalesPlanModel`** is a genuine **derived-model boundary** for the wizard (rollups, charts, insights, capacity).  
- **Incremental evolution** discipline: types in `types/sales-plan.ts`, wizard store, i18n (`en`/`ar`), tests for `engine` + `build-model` + `workbook-engine`.  
- **Supabase workspace loader** (`server/planning/workspace.ts`) anticipates relational `planning_matrix_*` and `deal_tier_lines`—shows intent toward real persistence.

## 1.5 Major weaknesses

- **Dual engine / dual CM story** between dashboard scenarios and workbook / sales plan.  
- **No authoritative planning cube**—no dimensions, slices, or versioned snapshots.  
- **Capacity & “operational intelligence”** in `buildSalesPlanModel` are **heuristic** (coefficients chosen for UX, not calibrated models).  
- **Insights** are rule-based strings—not a dependency graph, not probabilistic.  
- **Collaboration / approvals / audit** absent.  
- **Companies page** partially English-hardcoded; not parity with `next-intl` coverage of Sales Plan.

## 1.6 Enterprise readiness (honest)

| Capability | Ready? |
|------------|--------|
| Multi-company demo switching | Partial (in-memory) |
| Deterministic replanning in browser | Yes (within demo state) |
| Auditable numbers across teams | No |
| Server-side planning source of truth | No (unless full Supabase productization completed) |
| Dimensional planning | No |
| Actual vs plan | No |
| Monte Carlo / distributions | No |

---

# 2. Product vision alignment audit

## 2.1 Sales Plan OS vision

**Aligned**

- Multi-step wizard, tier economics, funnel back-solve, quarterly split, segment revenue, charts, insights list.  
- `applyPlanToWorkspace` pushes **fixed** + **npTarget** + **opportunity tier bands** into `DemoCompany`—bridges wizard to workspace.

**Partially aligned**

- “Operational forecasting” is **synthetic** (capacity index) not staffing-constrained scheduling.  
- “Strategic” insights are **threshold rules**, not portfolio optimization.

**Missing vs stated enterprise vision**

- Driver graph (headcount, bandwidth, hiring) as first-class inputs with conservation laws.  
- Assumptions center as versioned entities referenced by formulas.  
- Actuals ingestion and variance.

## 2.2 Workbook logic alignment

**Strong:** `PlanningWorkbookPanel` uses `pickBlendedMargin` → `computeWorkbookTargets` with scenario NP override—this is the **most faithful** UI to `workbook-engine`.

**Weaker:** Executive dashboard also calls `runForecastEngine` which uses **stream-weighted CM** or company CM—not always the same tier-matrix blended margin as the workbook panel unless user keeps them aligned manually.

## 2.3 Architecture drift (specific)

- **`contributionMarginPct` on `DemoCompany`** vs **tier lines** vs **Sales Plan contribution cells**—three representations of “margin story” can coexist with different numbers.  
- **`marketSegments` on `DemoCompany`** (string labels) vs **`MarketSegmentShare`** in Sales Plan (governmental/private/…) are **not the same model**.

---

# 3. Folder structure audit

## 3.1 Current layout (high level)

```
src/
  app/[locale]/        — App Router, locale layout, dashboard routes
  app/api/planning/    — Planning import/export/matrix/workspace API routes
  components/          — UI + feature components (layout, dashboard, sales-plan, planning)
  data/                — Seeds, defaults (demo-seed, tier lines, opportunity tiers)
  hooks/
  i18n/                — routing, request, navigation
  lib/
    calculations/      — Legacy-style forecast engine + pipeline helpers
    planning/          — workbook-engine (LOTF-aligned)
    sales-plan/        — Sales Plan OS engine + buildSalesPlanModel + tests
  server/planning/     — Supabase workspace aggregation (DTO)
  stores/              — Zustand (workspace, wizard, ui)
  types/               — domain + sales-plan types
```

## 3.2 Strengths

- **`lib/planning`** vs **`lib/sales-plan`** separation is directionally correct (workbook vs OS).  
- **Tests colocated** with `engine`, `build-model`, `workbook-engine`.

## 3.3 Risks

- **`lib/calculations/engine.ts`** overlaps conceptually with **`workbook-engine`** (sales target / NP gap)—**semantic duplication**.  
- **`server/planning/workspace.ts`** uses **snake_case DTO** shapes vs **`types/domain.ts`** camelCase—integration will require **mappers** (not yet centralized).

## 3.4 Recommendations (structure)

1. Introduce **`lib/planning/measures/`** (or similar) with a single **`PlanningContext`** type and **pure functions** that both dashboard and Sales Plan call—**one** sales target implementation.  
2. Move **`runForecastEngine`** outputs to be **derivable from** workbook targets where possible, or rename domains (“P&L snapshot” vs “LOTF target”) to avoid false equivalence.  
3. Add **`mappers/`** for Supabase ↔ domain before scaling data.

---

# 4. Database & data model audit

## 4.1 What exists

- **Demo model:** `DemoCompany`, `DemoScenario`, `DemoOpportunity`, `DemoRevenueStream` in `types/domain.ts` + `data/demo-seed.ts`.  
- **Zustand persist:** `efp-workspace`, `efp-sales-plan-wizard` (localStorage).  
- **Supabase:** client/server helpers; `loadPlanningWorkspace()` expects relational tables (`organizations`, `companies`, `revenue_streams`, `scenarios`, `opportunities`, `forecasts`, `planning_matrix_rows`, `planning_matrix_cells`, `revenue_stream_deal_tier_lines`).

## 4.2 Normalization quality

**Demo path:** intentionally denormalized for UX velocity—acceptable for demo, **not** a normalized planning star schema.

**Supabase path:** appears **normalized** in intent (separate tables). **Gap:** client UI does not consistently hydrate from this DTO into the same stores as the wizard.

## 4.3 Missing enterprise entities

- **Time dimension** beyond simple annualization / quarterly weights.  
- **Version / snapshot** of a plan.  
- **Assumption object** (typed, versioned, effective-dated).  
- **Actuals fact** table and grain definition.  
- **User / role / approval** entities.

## 4.4 “Spreadsheet-like persistence” problems

- **Wizard + workspace** can diverge: wizard persists locally; company patch updates in-memory demo store—**no server reconciliation**.  
- **Tier line overrides** keyed by stream id in a flat `Record<string, TierLine[]>`—works, but is not a relational “planning matrix” with concurrency control.

---

# 5. Planning engine audit

## 5.1 `workbook-engine.ts`

**Role:** LOTF-style blended margin selection; `computeWorkbookTargets` for sales target, NP at target, ROI.

**Quality:** High clarity, small surface, tested.

**Limits:** Single-period; no seasonality inside this module; no tax/interest distinction (EBITDA-style simplification elsewhere).

## 5.2 `sales-plan/engine.ts`

**Role:** Bridges workbook targets + operational math (`requiredAwardsFromRevenue`, funnel back-solve, quarterly ops, weighted CM/ADV helpers).

**Quality:** Coherent; explicit min-deal floor semantics.

**Limits:** Funnel is **single global chain** applied per context; not multi-segment funnels.

## 5.3 `buildSalesPlanModel`

**Role:** **Best architectural artifact in Sales Plan OS**—aggregates tier rollups, service rollups, segment revenue, charts, insights, capacity.

**Issues**

- **Fixed allocation** to tier rows is **revenue-proportional split of annual fixed**—reasonable teaching model, **not** ABC costing or driver-based allocation.  
- **Capacity** uses opaque coefficients—documented as heuristic; **not** calibrated to real delivery data.

## 5.4 Duplicated or divergent calculation flows

| Concern | Location A | Location B |
|---------|-----------|------------|
| Sales target from CM−NP gap | `workbook-engine.salesTargetFromBlendedMargin` | Used via `computeTargetsFromPlan` |
| Monthly P&L style snapshot | `runForecastEngine` | Dashboard / scenarios |
| Blended CM | `pickBlendedMargin` (tier lines) | Weighted stream CM on dashboard base engine |

**Risk:** KPI cards can show numbers that **do not reconcile** to Sales Plan OS without disciplined input sync.

---

# 6. Formula integrity audit

## 6.1 Intended chain (Sales Plan OS path)

```
Annual revenue target  ← 12 × monthly sales target (workbook)
Portfolio ADV           ←  weighted tier ADV × mix × service shares
Awards (annual)         ←  revenue / ADV with floor rule
Funnel                  ←  back-solve from awards ÷ conversion chain
Quarterly ops           ←  split revenue + funnel per quarter weights
Tier rollups            ←  revenue × CM, variable + delivery, awards per tier
Segment revenue         ←  annual revenue × normalized segment weights
Capacity index          ←  heuristic function of awards × complexity / baseline
```

**Integrity within `buildSalesPlanModel`:** **Good**—single function builds dependent objects in order.

## 6.2 Break points / drift

- **Wizard step 14** historically recomputed quarterly awards with `requiredAwardsFromRevenue(row.revenue, model.portfolioAdv)`—must stay aligned with `quarterlyOps` semantics (portfolio ADV vs per-quarter nuance).  
- **Dashboard** `runForecastEngine` ROI vs **workbook** ROI: same words, **different formulas** (NP definition differs: contribution-only vs simplified P&L block).

## 6.3 Circular risks

**Low** today—mostly acyclic pure functions. **Future risk** high if a reactive measure graph is added without DAG discipline.

## 6.4 Hidden assumptions

- **Mega tier default disabled** in contribution matrix seed—impacts portfolio ADV and mega dependency insight.  
- **Conversion rates** as point estimates—no uncertainty.  
- **Government 40% cap** insight is a **policy threshold**, not user-configurable constraint engine.

---

# 7. Forecasting & scenario audit

## 7.1 Scenario model (`DemoScenario`)

Fields: `npTargetPct`, `revenueMixAdj`, `conversionRateAdj`, `fixedCostAdj`, `growthAdj`, `pipelineWeightAdj`.

## 7.2 `applyScenario`

**Nature:** **Heuristic multipliers** on base inputs—useful for **relative** comparisons, not auditable macro drivers.

## 7.3 Isolation

- Scenarios are **not isolated snapshots**—they recompute from current base company + opportunities each render.  
- **No scenario versioning**, **no diff**, **no approval**.

## 7.4 Multidimensional readiness

**Low:** scenario is a flat adjustment vector, not a tuple of (time × product × scenario) facts.

---

# 8. UI / UX architecture audit

## 8.1 Wizard scalability

- **18 steps** + horizontal step pills—works for power users; **risk of cognitive overload** for casual users.  
- **Advanced roadmap panel** optional—good pattern to avoid forcing complexity.

## 8.2 Dashboard scalability

- Recharts + many cards—fine for demo dataset sizes.  
- **Performance risk** if opportunities list grows large (client-side filtering/reduction on every render unless memoized—partially memoized).

## 8.3 Enterprise usability

- Strong: command palette, keyboard shortcuts hook, theme toggle with hydration guard.  
- Weak: **no saved views**, **no grid persistence** to server in default demo path.

## 8.4 Multilingual / RTL

- **Sales Plan:** strong `salesPlan` namespace.  
- **Some pages** (e.g. companies management copy) remain **English-hardcoded**—inconsistent enterprise i18n posture.

---

# 9. State management audit

## 9.1 Stores

| Store | Role | Persistence |
|-------|------|-------------|
| `use-workspace-store` | Companies, scenarios, opps, tier overrides | `localStorage` partial |
| `use-sales-plan-wizard-store` | Wizard + tier bands + advanced UI flag | `localStorage` + migrate |
| `use-ui-store` | Sidebar, command palette | Typically ephemeral |

## 9.2 Coupling

- **Tight:** `applyPlanToWorkspace` calls `useWorkspaceStore.getState()` inside wizard store—**acceptable** for demo; **anti-pattern** at scale (hidden side effects, harder to test in isolation).

## 9.3 Derived state

- **Good:** `SalesPlanWizard` uses `useMemo` + `buildSalesPlanModel`.  
- **Risk:** any future “second model” built outside `useMemo` duplicates risk.

## 9.4 Stale data

- Switching company hydrates tier bands—good.  
- **No event bus** if company updated elsewhere while wizard open—Zustand doesn’t auto-merge unless subscribed.

---

# 10. Insights & intelligence audit

## 10.1 Implemented insights (`PlanningInsightId`)

Includes: share drift, segment drift, tier mix drift, mega dependency, Q4 overload, NP unreachable, min deal floor, capacity pressure/severe, government share cap.

## 10.2 Quality

- **Strength:** deterministic, testable, mapped to i18n.  
- **Weakness:** **no prioritization**, **no dedupe policy** beyond insertion order, **no “fix it” actions** wired to insights (user must manually normalize).

## 10.3 Missing executive intelligence

- No **narrative generator** (LLM optional) grounded on measure deltas.  
- No **confidence** or **range** forecasts.  
- No **dependency graph** (“if mega drops 5 pts, NP changes X”).

---

# 11. Capacity planning audit

## 11.1 Implemented

`buildSalesPlanModel` computes `loadIndex`, `baselineCapacity`, `utilizationPct`, `pressure` band; insights at high utilization.

## 11.2 Reality check

This is **not** capacity planning in the ERP sense—no calendars, no FTE, no skill mix, no SLA-based throughput.

## 11.3 Missing drivers

- Real **delivery hours / ticket throughput**.  
- **Hiring lead times** and ramp curves.  
- **Parallelism limits** (concurrent bids).

**Classification:** **UX-grade capacity signal**, not operational planning engine.

---

# 12. Enterprise readiness audit

| Area | Assessment |
|------|------------|
| Multi-company | Demo-level switching only |
| Collaboration | Not implemented |
| Approvals | Not implemented |
| Audit history | Not implemented |
| Actual vs plan | Not implemented |
| Snapshots | Not implemented |
| Assumptions center (data) | UI narrative only (`AdvancedEnterprisePanel`) |
| Roles / permissions | Optional Supabase auth env; not planning RBAC |
| Large datasets | No virtualization strategy documented for matrix at scale |

---

# 13. Missing enterprise layers (explicit checklist)

The following are **not** implemented as first-class systems (some have **partial analogues** noted):

1. **Dimensional planning registry** (Time × Scenario × Product × …)  
2. **Measures & formula DAG** with reactive invalidation  
3. **Driver-based planning** (headcount, bandwidth, hiring curves) as conserved resources  
4. **Assumptions center** (versioned, effective-dated, referenced by measures)  
5. **Actuals ledger + variance**  
6. **Rolling forecast workflow**  
7. **Goal seek** beyond what NP-gap algebra already implies (no multi-constraint goal seek UI)  
8. **Constraint solver** (rules exist as insights; no solver / no soft penalties)  
9. **Monte Carlo / distributions**  
10. **Collaborative planning** (comments, locks, approvals)  
11. **Planning snapshots / audit trail**  
12. **Forecast confidence scoring**  
13. **Seasonality engine** beyond static quarterly weights  
14. **Strategic dependency graph** (service concentration, client concentration—not modeled)  
15. **Enterprise data warehouse / OLAP path** for heavy aggregates

---

# 14. Technical debt & risk assessment

## Critical

| Item | Why |
|------|-----|
| **Dual financial engines without ownership** | KPI inconsistency, user mistrust, hard debugging |

## High

| Item | Why |
|------|-----|
| **Client-only planning truth** | No audit trail; cannot scale to teams |
| **Supabase DTO vs domain mismatch** | Integration bugs when connecting real data |
| **Wizard ↔ workspace sync** | Partial apply; fields can drift |

## Medium

| Item | Why |
|------|-----|
| **18-step wizard without role-based simplification** | Adoption risk |
| **Heuristic capacity** | Misleading if presented as “truth” |
| **i18n parity gaps** | Enterprise language requirements |

## Low

| Item | Why |
|------|-----|
| **Framer Motion usage** | Bundle cost; manageable |
| **Recharts SSR** | Mitigated via dynamic import on Sales Plan page |

---

# 15. Recommended evolution roadmap

## Phase 1 — Core stability & formula integrity (4–8 weeks eng equiv.)

**Objectives**

- Single **measure layer** for sales target / NP / ROI consumed by dashboard + workbook + Sales Plan preview.  
- Input mapping document + code: **one blended CM definition** per surface or explicit “mode” labels in UI.

**Refactors**

- Extract `PlanningMeasureKit` from `workbook-engine` + `sales-plan/engine` + prune duplicate formulas in `calculations/engine.ts` or clearly namespace outputs.

**Dependencies**

- None external; high internal discipline.

**Risks**

- Short-term UI number shifts when unifying—communicate as “correctness fix”.

**Complexity:** **Medium–High**

---

## Phase 2 — Planning infrastructure (8–16 weeks)

**Objectives**

- **Assumption objects** (typed) + **scenario snapshots** (immutable).  
- Server persistence path selected: **Supabase-first** or “API + DB” with migration from Zustand seed.

**Refactors**

- Mappers from `PlanningWorkspaceDTO` → domain models; stop using raw `Record<string, unknown>` long-term.

**Dependencies**

- Auth, RLS policies, org scoping.

**Risks**

- Data migration from localStorage demo to cloud.

**Complexity:** **High**

---

## Phase 3 — Enterprise planning engine (16+ weeks)

**Objectives**

- **Dimension registry** + **facts** at grain (month × product × scenario).  
- **Measure graph** with topological evaluation + caching.

**Dependencies**

- Phase 2 stable persistence.

**Risks**

- Over-engineering if requirements not frozen—use pilot dimensions only.

**Complexity:** **Very high**

---

## Phase 4 — Operational forecasting intelligence (12+ weeks)

**Objectives**

- Replace heuristic capacity with **driver-linked** model even if simplified (FTE, hours/deal, concurrency).  
- Segment-specific funnels optional.

**Dependencies**

- HR / delivery data feeds or manual driver inputs.

**Complexity:** **High**

---

## Phase 5 — Strategic AI & advanced analytics (ongoing)

**Objectives**

- Narrative insights grounded in measure deltas; optional Monte Carlo on drivers.

**Risks**

- Trust / explainability; guardrails required.

**Complexity:** **Medium** (AI) + **High** (simulation correctness)

---

# 16. Final enterprise assessment

## Question

Is the platform **currently evolving** into a **real enterprise planning platform**, or is it still primarily an **advanced dashboard application**?

## Answer

It is **unequivocally evolving toward** a more serious **planning + forecasting surface**—especially via **`workbook-engine`**, **`PlanningWorkbookPanel`**, and **`buildSalesPlanModel` / Sales Plan OS**, which encode **non-trivial financial and operational structure** beyond vanity metrics.

However, **today’s default runtime posture** (demo Zustand, heuristic scenarios, heuristic capacity, no actuals, no collaboration, dual engine risk) means the product **still behaves mostly like an advanced, well-designed dashboard and planning demo**, not a **multidimensional FP&A system of record**.

**The decisive gap** between “dashboard” and “enterprise planning platform” is not UI polish—it is **(a) a single auditable measure layer**, **(b) persistent multidimensional facts**, and **(c) actuals + governance**. Until those exist, the honest classification is: **advanced planning-capable dashboard** on a **credible math foundation**, with a **clear roadmap** (now partially articulated in-product via the advanced panel).

---

## Appendix A — Key files reference (audit trail)

| Concern | Primary files |
|---------|----------------|
| Workbook math | `src/lib/planning/workbook-engine.ts` |
| Sales plan ops math | `src/lib/sales-plan/engine.ts`, `weighted-adv.ts` |
| Derived Sales Plan model | `src/lib/sales-plan/build-model.ts` |
| Legacy P&L-style forecast | `src/lib/calculations/engine.ts` |
| Pipeline helpers | `src/lib/calculations/pipeline.ts` |
| Workspace demo state | `src/stores/use-workspace-store.ts`, `src/data/demo-seed.ts` |
| Sales Plan wizard state | `src/stores/use-sales-plan-wizard-store.ts` |
| Workbook UI | `src/components/planning/planning-workbook-panel.tsx` |
| Sales Plan UI | `src/components/sales-plan/sales-plan-wizard.tsx`, `sales-plan-charts.tsx`, `advanced-enterprise-panel.tsx` |
| Supabase workspace | `src/server/planning/workspace.ts` |
| i18n | `src/i18n/*`, `messages/en.json`, `messages/ar.json` |
| Tests | `src/lib/**/*/*.test.ts` |

---

## Appendix B — Routing & API surface inventory

## B.1 App Router (observed)

- **Root layout:** `src/app/layout.tsx`  
- **Locale wrapper:** `src/app/[locale]/layout.tsx` — `next-intl`, `LocaleHead`, `dir` for RTL  
- **Dashboard segment:** `src/app/[locale]/(dashboard)/layout.tsx` → `AppShell`  
- **Key routes:** `/`, `/companies`, `/forecasts`, `/scenarios`, `/pipeline`, `/sales-plan`, `/grid`, `/assistant`, `/settings` (all under `[locale]`)  
- **Sales Plan:** dynamic client load pattern in `sales-plan/page.tsx` (reduces SSR/hydration friction for heavy client tree)  
- **Middleware:** `src/middleware.ts` — intl routing + optional Supabase auth gate via env flags  

## B.2 API routes (`src/app/api`)

| Route | Purpose (inferred) |
|-------|---------------------|
| `api/planning/workspace` | Workspace hydration / server aggregation |
| `api/planning/import`, `export` | Data interchange |
| `api/planning/matrix/cell` | Matrix cell updates (server-side planning grid) |
| `api/assistant` | Assistant proxy |
| `auth/callback` | OAuth callback |

**Audit note:** These endpoints indicate **intent** for server-backed planning; **client demo path** may still bypass them depending on environment configuration. Enterprise readiness requires **one** primary data path, not parallel “demo vs API” mental models for planners.

---

## Appendix C — Audit methodology limitations

- This audit is based on **static code review** and **architectural patterns** observed in the repository at audit time.  
- It does **not** include production telemetry, load testing, or security penetration results.  
- **Line-level proof** of every UI branch was not exhaustively traced; high-traffic paths (dashboard, workbook panel, wizard) were prioritized.

---

## Appendix E — Forward forecast foundation (2026-05-17)

Executive and `/forecasts` read **`evaluateForwardForecast`** via `evaluateEconomicsGraph` (`src/lib/planning/forward-forecast/`): scenario-aware financial roll-forward (stream CM, active engine anchor), HR-backed operational utilization/hiring trajectory, workbook target attainment, and deterministic sustainability narratives. Path A `buildRollingForecastSeries` remains only for grid sandbox reset (`legacy-company-series.ts`). No AI, no `forecasts` table writes in v1.

---

## Appendix G — Sales incentive economics (2026-05-17)

BU-scoped **IncentivePlan** + deterministic **`evaluateIncentiveRun`** (`src/lib/incentives/`) produce immutable **IncentiveSnapshot** outputs with explain lines. Types: [`src/types/incentives.ts`](src/types/incentives.ts); CRM fact contract: [`src/types/incentive-facts.ts`](src/types/incentive-facts.ts). UI: `/sales-incentives`. Opportunity tiers for rules use Sales Plan SAR bands via [`opportunity-tier-display.ts`](src/lib/planning/opportunity-tier-display.ts) — not legacy workbook demo bands. Scorecard attainment bridges [`buildSalesPlanModel`](src/lib/sales-plan/build-model.ts). Full design: [`docs/INCENTIVE_ECONOMICS_ARCHITECTURE.md`](docs/INCENTIVE_ECONOMICS_ARCHITECTURE.md).

---

## Appendix F — Canonical surfaces & redirects (2026-05-17)

**Primary nav:** Executive (`/`), Sales Plan, Service Architecture, Calculator (`/service-architecture/commercial-pricing`), HR Workforce, Settings. **Advanced:** Forecast matrix (`/grid`), Scenario library (`/scenarios`), Pipeline demo, AI assistant.

**Redirects (Next.js + client):** `/companies` → Sales Plan; `/calculator` → commercial-pricing; `/forecasts` → Executive `/#rolling-forecast`. Executive uses a single `useEconomicsGraph` call (one `evaluateEconomicsGraph` per render). Grid matrix remains sandbox/demo roll-forward; tier workbook editor on Grid with link from Executive workbook KPIs.

---

## Appendix D — Economics orchestration (2026-05-17)

Planning and commercial surfaces now read through **`evaluateEconomicsGraph`** (`src/lib/platform-economics/evaluation/`) and shared primitives (`src/lib/planning/primitives/`): stream CM wraps `contributionFromStreams`, forecast sandbox P&L uses `monthlyPnLFromCm`, commercial model compare uses `compareCommercialModels`, and deal margins align with `computeCommercialMargins`. UI routes should not call `runForecastEngine`, `pickBlendedMargin`, or `computeWorkbookTargets` directly (`npm run verify:ui-engines`). Supabase `revenue_stream_deal_tier_lines` hydrate into `scenarioBundles[].tierLineOverrides` when scenario JSON has no override. Stream CM (scenario engine) and workbook CM (tier matrix) remain separate measure IDs.

---

*End of PROJECT ARCHITECTURE AUDIT.*
