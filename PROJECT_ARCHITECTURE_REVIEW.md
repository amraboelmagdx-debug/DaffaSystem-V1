**Enterprise Forecast Platform — Project Architecture & Engineering Review**

**Document type:** Technical audit, architecture review, scalability & risk assessment, continuation guide  
**Scope:** Full repository as of review date (Next.js 15, React 19, TypeScript, Zustand, Supabase client, HR workforce module, planning/sales-plan stack)  
**Audience:** Senior engineers / architects continuing major modules (Catalog, Allocation, Profitability, Forecasting)

---

# 1. Executive Technical Summary

## 1.1 Current maturity level

| Dimension | Assessment | Notes |
|-----------|------------|-------|
| **Core calculation libraries (HR OH, workforce cost)** | **Medium–High** | Clear pure functions, documented formulas, targeted unit tests (`oh-engine`, `oh-numerator`, `workforce-cost-engine`, `monthly-hours`) |
| **Planning / executive measures** | **Medium–High** | Explicit measure registry, parity tests in `lib/planning/measures/*` |
| **UI & dashboards** | **Medium** | Polished UX patterns (shadcn, cards, i18n), but heavy client derivation and limited component/integration tests |
| **Data platform & multi-tenant backend** | **Low (for “enterprise product”)** | Primary state is **browser-local persistence** (Zustand `persist`); Supabase is wired for **auth/session** patterns, not yet a unified domain persistence layer for HR/workspace |
| **Test coverage breadth** | **Low–Medium** | ~14 `*.test.ts` files; strong in **libraries**, weak in **routes, stores, and large views** |

**Overall:** The codebase is a **strong analytical prototype / internal planning tool** with **serious library-level discipline** in selected domains (especially HR math and parts of planning). It is **not yet** a full **multi-user, server-authoritative, audited financial system** without further infrastructure.

## 1.2 Overall architecture quality

- **Strengths:** Separation of **pure engines** (`src/lib/hr-workforce/*`, `src/lib/calculations/engine.ts`, `src/lib/planning/*`) from **React views**; **typed domain models** (`src/types/hr-workforce.ts`, `src/types/domain.ts`); **explicit derivation** (`deriveHrWorkforceModel`, `deriveWorkforceIntelligence`).
- **Weaknesses:** **Client-only source of truth** for key domains; **multiple chart stacks** (ECharts + Recharts in `package.json`); **large monolithic store** for HR (`use-hr-workforce-store.ts`); **repeated full re-derivation** in several views instead of a single memoized “workspace projection” layer.

## 1.3 Major strengths

1. **OH & workforce math** are implemented as **small, testable modules** with clear comments (e.g. `oh-engine.ts` step list).
2. **Composed OH numerator** avoids circular OH stacking by using **std cost at OH rate = 0** for indirect slice (`oh-numerator.ts` + `workforce-cost-engine`).
3. **Import dry-run** pipeline separates **planning** from **mutation** (`import-dry-run.ts` + `buildImportPlan`).
4. **Snapshots** capture structured payloads (`HrSnapshotPayloadV2`) with migration path from v1 (`parseHrSnapshotPayload`).
5. **Intelligence layer** introduces **derived analytics** decoupled from UI (`lib/hr-workforce/intelligence/*`).

## 1.4 Major risks (honest)

| Risk | Severity | Why it matters |
|------|----------|----------------|
| **No server-side HR/workspace authority** | **High** | Collaboration, audit trails, concurrent edits, and regulatory expectations are not met by `localStorage` + JSON snapshots alone |
| **O(all BUs × roles)** derivation on each HR change | **Medium** | `deriveHrWorkforceModel` loops **every business unit** and rebuilds OH bundles; acceptable now, painful at scale |
| **Dual chart libraries** | **Medium** | Bundle size, consistency, and maintenance duplication |
| **Dev disk persist API** (`/api/dev/hr-workforce-disk`) | **Medium** (Critical if mis-deployed) | Gated by `NODE_ENV` / `HR_WORKFORCE_DISK_SYNC`; **no auth** — dangerous if enabled on a shared host |
| **Heuristic “management/support” split** in intelligence | **Medium** | `classify-workforce-segment.ts` uses regex on role names; **not** persisted truth — easy to mislead executives if sold as HR truth |

## 1.5 Readiness for next phase (Catalog, Allocation, Profitability, Forecasting)

| Next module | Readiness | Blockers / prerequisites |
|-------------|-----------|---------------------------|
| **Product / Service Catalog** | **Partial** | Need **canonical entity model** (SKU/service line, versioning, ownership) and **persistence strategy**; today’s domain types are **forecast/sales/HR-centric**, not catalog-centric |
| **Allocation engine** | **Low–Medium** | Requires **cost object dimensions** (project, contract, service line) and **rules engine**; OH today allocates at **BU × hourly** granularity, not deliverable-level |
| **Profitability** | **Low–Medium** | Needs **revenue attribution** + **COGS mapping** + **time-phased actuals**; current P&L path is **demo workspace + scenario engine**, not ERP-grade |
| **Forecasting engine (beyond current)** | **Medium** | `runForecastEngine` / `applyScenario` exist but are **simplified**; scenario objects are **not** unified with HR snapshots or catalog |

**Verdict (one line):** Foundation is **strong for calculations and UX iteration**, **weak for multi-user enterprise data and cross-domain allocation** until persistence, identity, and domain boundaries harden.

---

# 2. Current System Architecture

## 2.1 Architecture style

- **Next.js App Router** with `[locale]` segmentation (`src/app/[locale]/...`).
- **Client-heavy “spreadsheet app” architecture:** most business state in **Zustand** stores hydrated on the client.
- **Library-style “engines”** for deterministic math (HR, forecast, workbook, sales-plan).
- **API routes** for planning import/export/matrix (`src/app/api/planning/*`) and **dev-only** HR disk mirror (`src/app/api/dev/hr-workforce-disk`).

## 2.2 Module boundaries (intended)

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Types** | `src/types/*` | Domain shapes |
| **Engines** | `src/lib/*` | Pure functions, testable |
| **State** | `src/stores/*` | Persistence + mutations |
| **Views** | `src/components/*` | Presentation + wiring |
| **App shell** | `src/app/*`, `components/layout/*` | Routing, providers |

## 2.3 Separation of concerns — strengths

- HR **selectors** (`selectors.ts`) centralize `deriveHrWorkforceModel` — good single entry for engine orchestration.
- **Intelligence** is a **downstream projection** of `HrWorkforceDerived` — avoids mixing analytics into the core engine file.

## 2.4 Separation of concerns — weaknesses & coupling

| Issue | Severity | Detail |
|-------|----------|--------|
| **Store ↔ parser coupling** | **Medium** | `parseHrSnapshotPayload` exported from `use-hr-workforce-store.ts` — convenient but **blurs** “store” vs “domain serialization” |
| **Views call `deriveHrWorkforceModel` directly** | **Medium** | Multiple large components (`hr-workforce-dashboard-view`, `hr-workforce-intelligence-view`, `hr-workforce-operational-workspace`, organization view) — **duplication risk** if derivation options diverge |
| **Intelligence ↔ snapshot semantics** | **Medium** | Snapshot replay is **org-wide** in trend helper; BU-scoped UI must **suppress** trend or risk misleading deltas (partially addressed via `disableSnapshotTrend`) |

---

# 3. Folder & Codebase Review

## 3.1 Folder organization

```
src/
  app/           # Routes, layouts, API handlers
  components/    # UI (feature folders + ui/)
  lib/           # Engines, parsers, planning, supabase helpers
  stores/        # Zustand stores
  types/         # Shared TS types
  hooks/, i18n/, data/
```

**Assessment:** Conventional and **scalable for a single product team**. HR is reasonably namespaced under `lib/hr-workforce` and `components/hr-workforce`.

## 3.2 Naming & consistency

- Generally consistent **kebab-case** files, **PascalCase** components.
- Occasional **path duplication** in tooling output (`stores/use-hr-workforce-store.ts` vs backslash variant) — cosmetic, not functional.

## 3.3 Messy / high-churn areas

| Area | Concern | Severity |
|------|---------|----------|
| `use-hr-workforce-store.ts` | **~826 lines** — persistence, migrations, snapshots, import, CRUD in one module | **High** maintainability debt |
| `hr-workforce-organization-view.tsx` | **~1,012 lines** — single-file UI + structure editing surface | **Medium** |
| **Two chart ecosystems** | `echarts` + `recharts` both depended | **Medium** |

## 3.4 Duplicated / weak abstractions

- **Chart color helpers** reimplemented in multiple chart files (e.g. dashboard charts vs intelligence org chart) — drift risk.
- **Formatting** (`Intl.NumberFormat`) duplicated across views — acceptable short-term; should become **shared formatters** if catalog adds more surfaces.

---

# 4. State Management Review

## 4.1 Zustand stores (inventory)

| Store | Key | Persistence | Role |
|-------|-----|---------------|------|
| `use-workspace-store` | `efp-workspace` | Yes | Demo companies, streams, scenarios |
| `use-hr-workforce-store` | `efp-hr-workforce` (+ hybrid disk in dev) | Yes | Full HR module |
| `use-sales-plan-wizard-store` | (persist) | Yes | Wizard flow |
| `use-ui-store` | varies | Partial / UI | Shell preferences |

**Issue:** **No single “app session” orchestrator** — cross-module invariants (e.g. “company X uses BU Y cost basis”) are **implicit**, not enforced by a typed coordinator.

## 4.2 Derived selectors & recalculation

- **Pattern:** `useMemo(() => deriveHrWorkforceModel({...}), [deps])` in views.
- **Risk:** Easy to **miss a dependency** or pass a **stale slice** (subtle bugs). ESLint `react-hooks/exhaustive-deps` mitigates if enforced strictly.

## 4.3 Persistence risks

| Risk | Severity | Notes |
|------|----------|-------|
| **localStorage quota** | **Medium** | Snapshots + roles JSON can grow; capped at 50 snapshots in store but still large |
| **Cross-tab race** | **Medium** | Last writer wins on persist rehydration |
| **Port / origin isolation** | **Low** (known) | Different localhost ports = different storage — mitigated by **dev disk mirror** only in dev |
| **Disk mirror API** | **High** if misconfigured | Must never expose unauthenticated read/write of financial JSON in production |

## 4.4 Hybrid HR persist storage

File: `src/lib/hr-workforce/hr-workforce-hybrid-persist-storage.ts`

- **Pros:** Solves developer UX for multi-port local dev.
- **Cons:** **Two sources of truth** momentarily possible if user edits in two ports concurrently.

---

# 5. Workforce Cost Engine Review

**Primary files:** `workforce-cost-engine.ts`, `monthly-hours.ts`, `aggregates.ts`, `role-operational-type.ts`

## 5.1 Correctness & formula consistency

- **Direct labor:** Monthly hours × headcount denominator for hourly rate; utilization **explicitly excluded** from direct rate path (comment in engine — good boundary).
- **OH surcharge:** `ohAdjustedHourlyCost = standardHourlyCost + ohRatePerHour` per role, with optional **zero-out** for non-billable when composed numerator is active (`skipOhSurchargeOnNonBillable` in `selectors.ts`) — **prevents double stack** of indirect into indirect in composed mode.

## 5.2 Edge cases & risks

| Topic | Severity | Comment |
|-------|----------|---------|
| **Percentage additional costs** | **Medium** | Multiple bases (`percentageBasis`) — correct if UI always valid; **needs golden tests** per basis |
| **Risk factor** | **Low–Medium** | Applied as multiplier on subtotal — sensitive to double-count if users treat risk as “OH” mentally |
| **Currency** | **Medium** | Per-role currency with migration on load — good, but **cross-currency rollups** in intelligence assume a **display currency**; not FX engine |
| **Rounding** | **Low** | EPS constants used in some paths; monetary display rounding vs internal double — standard risk |

## 5.3 Scaling

- `computeAllRoleBreakdowns` is **O(roles)** per derivation — fine for hundreds; watch **thousands** with frequent edits unless debounced.

---

# 6. OH Engine Review

**Files:** `oh-engine.ts`, `oh-numerator.ts`, `selectors.ts`, `structure-utils.ts`

## 6.1 Numerator / denominator

- **Denominator:** `computeOhEngine` — hours ladder × utilization × billable headcount — **linear, transparent**.
- **Numerator:** Either **manual annual** OR **composed** = indirect non-billable std payroll + non-workforce lines + additional bucket (`resolveOhAnnualNumerator`).

## 6.2 Strengths

- **Composed mode** uses **OH rate = 0** breakdown for indirect slice — **critical** correctness choice.
- **Per-BU OH manual map** supports holding structures.

## 6.3 Weaknesses & future allocation limitations

| Issue | Severity | Impact on future allocation |
|-------|----------|----------------------------|
| **OH is hourly surcharge, not activity-based** | **High** (for allocation) | Allocation to SKU/project needs **driver rates** beyond single OH $/hr |
| **Non-workforce line bucketing** | **Medium** | Intelligence categorizes by **regex on name/category** — OK for UX, **not** for legal cost allocation |
| **BU isolation in engine** | **Medium** | Shared services across BUs are **not modeled** — future “corporate allocation” will fight current structure |
| **Billable FTE source** manual vs roles | **Medium** | Good flexibility; easy to **desync** from operational roles if users misconfigure |

---

# 7. Dashboard & Intelligence Layer Review

**Files:** `hr-workforce-dashboard-view.tsx`, `hr-workforce-intelligence-view.tsx`, `intelligence/*`, `hr-workforce-dashboard-charts.tsx`

## 7.1 Strengths

- **Intelligence** consolidates KPIs, org distribution, economics, OH composition, capacity, benchmarking — aligns with “decision support” direction.
- **What-if OH** (`oh-scenarios.ts`) is explicitly **non-forecasting** simulation — correct scope boundary.

## 7.2 Weaknesses / noisy analytics risks

| Item | Severity | Notes |
|------|----------|-------|
| **Heuristic workforce segments** | **Medium** | Delivery vs support/management split for analytics only — must be labeled everywhere (partially via i18n copy) |
| **Chart + table duplication** | **Low–Medium** | Same facts shown multiple ways — can become noisy if unchecked |
| **Vanity metric risk** | **Medium** | Any KPI without “so what?” guardrails — team should enforce **insight copy** discipline (InsightBulb helps) |

## 7.3 UX consistency

- Generally consistent **card + muted description** language.
- **Intelligence scope** vs **OH scenario BU** — two selectors; **cognitive load** — document in UX guidelines.

---

# 8. Organization Structure Review

**Files:** `structure-utils.ts`, `hr-workforce-organization-view.tsx`, types in `hr-workforce.ts`

## 8.1 Model

- **BU → Department → Team (optional) → Role** with denormalized `businessUnitId` on roles.
- **Operational filter** `isRoleInActiveOperationalStructure` respects `useTeamLevel` and active flags.

## 8.2 Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **Denormalization drift** | **Medium** | If department moves BU without updating roles, inconsistencies — mitigated by sync helpers in store but **not impossible** |
| **Team optional** | **Low** | Correctly gated; increases test matrix |
| **No formal graph** | **Medium** | No generic “node/edge” model for future matrix orgs |

---

# 9. Import System Review

**Files:** `import-dry-run.ts`, `import-parser.ts`, `sheet-read.ts`, `validation.ts`, import UI

## 9.1 Strengths

- **Pure plan** (`buildImportPlan`) before apply.
- **Case-insensitive** name maps for BU/dept/team keys.

## 9.2 Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **applyImportDeltas concatenation** | **Medium** | Appends entities — duplicate **logical** entities with different IDs if names diverge slightly |
| **Rollback** | **High** (product expectation) | No transactional undo beyond snapshots / manual restore |
| **XLSX parsing** | **Medium** | External `xlsx` — classic supply-chain attack surface; ensure uploads are **never executed** as code (they aren’t — but validate size & rows) |

---

# 10. Snapshot System Review

**Files:** `use-hr-workforce-store.ts` (`saveSnapshot`, `restoreSnapshot`, `compareSnapshots`), payload types

## 10.1 Strengths

- Versioned payload (`v: 2`), migration from v1.
- **50 snapshot cap** reduces unbounded growth.

## 10.2 Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **No cryptographic integrity** | **Medium** | JSON string in localStorage — tamperable |
| **Engine evolution vs old snapshots** | **Medium** | Restored data reprocessed with **new** code — generally good, but **can change numbers silently** on restore after deploy |
| **Limited compare** | **Low** | `compareSnapshots` returns coarse deltas — OK for MVP |

---

# 11. Performance Review

## 11.1 Mental simulation

| Scale | Expected behavior | Risk |
|-------|-------------------|------|
| **100+ roles** | `deriveHrWorkforceModel` recomputes all BU bundles + breakdowns | **UI jank** if on every keystroke — mitigate with **debounced** patch updates or worker |
| **Many BUs** | Linear expansion of OH map | **Medium** CPU on client |
| **Large snapshots** | JSON parse + derive for trend | **Spikes** when opening intelligence |

## 11.2 Memoization

- Views use `useMemo` — good baseline.
- **Missing:** centralized **selector memoization** (e.g. `reselect`/`useShallow`) across unrelated subscriptions.

## 11.3 Visualization

- **ECharts** loaded dynamically in some paths — good.
- Still: **two chart libraries** in dependencies increases bundle pressure wherever both import chains load.

---

# 12. Technical Debt Review

## 12.1 Categorized debt

| Item | Risk | Category |
|------|------|----------|
| Monolithic HR store | **High** | Maintainability |
| Client-only persistence for HR | **High** | Enterprise readiness |
| Heuristic intelligence segments | **Medium** | Executive trust |
| Regex OH line categorization | **Medium** | Reporting accuracy |
| Dual chart stacks | **Medium** | Bundle / consistency |
| Limited integration tests | **Medium** | Regression safety |
| Dev disk API without auth | **High** (if enabled wrongly) | Security |

## 12.2 “Temporary logic” signals

- **Demo seed** paths (`demo-workforce-seed.ts`) — appropriate for onboarding, must not become production data path.
- **Demo workspace** (`demo-seed.ts`) — clearly non-production.

---

# 13. Future Readiness Review

## 13.1 Product / Service Catalog

**Strong today:** Typed domain discipline; component patterns; i18n.  
**Missing:** Canonical **catalog entities**, **versioning**, **API contracts**, **RBAC**, **multi-tenant storage**.

## 13.2 Allocation engine

**Strong today:** Per-role cost breakdown; BU-scoped OH; operational structure filter.  
**Missing:** **Cost drivers**, **dimensions** (project/service/contract), **allocation graph**, **solver** (linear programming or rules), **traceability** from source transaction to allocated cost.

## 13.3 Profitability

**Strong today:** Monthly workforce cost rollups; scenario P&L engine prototype.  
**Missing:** **Revenue recognition alignment**, **direct vs indirect mapping to offerings**, **actuals ingestion**.

## 13.4 Forecasting

**Strong today:** `runForecastEngine`, `applyScenario`, workbook & sales-plan engines with tests.  
**Missing:** **Unified time series model**, **statistical forecasting**, **variance analysis** tied to HR snapshots and catalog.

## 13.5 What NOT to build yet

1. **Multi-dimensional allocation** until **dimension model** + **persistence** exist.  
2. **Enterprise audit mode** until **immutable event log** exists.  
3. **Cross-module “one number” executive** until **measure lineage** is extended beyond planning bridge tests.

---

# 14. Architecture Recommendations

## 14.1 Stabilization (do first)

1. **Split `use-hr-workforce-store`** into: `hrStructureSlice`, `hrRolesSlice`, `hrSnapshotsSlice`, `hrImportSlice` (or similar) with composed store — or move logic to **reducers in `lib/`** and keep store thin.
2. **Single chart system** — pick **ECharts OR Recharts**, migrate the other.
3. **Central `deriveWorkspaceProjection()`** — one memoized selector feeding dashboard + intelligence + export.
4. **Golden tests** for `% additional cost` matrices and composed OH edge cases.

## 14.2 Scalability

- **Debounce** role grid bulk edits.
- Consider **Web Worker** for `deriveHrWorkforceModel` when role count > N.
- **Virtualize** large role tables (TanStack Table supports virtualization patterns).

## 14.3 Security / operations

- **Never** enable `HR_WORKFORCE_DISK_SYNC` on public hosts without auth + path sandboxing.
- Add **explicit** `if (process.env.NODE_ENV === 'production')` guards in dev routes (belt + suspenders).

---

# 15. Recommended Next Steps (Prioritized Roadmap)

## 15.1 Immediate (0–2 weeks)

| Priority | Action | Severity addressed |
|----------|--------|--------------------|
| P0 | Document **data residency** (browser vs server) for stakeholders | Trust / compliance |
| P0 | Audit **API route exposure** in production builds | Security |
| P1 | Add **integration smoke test** for snapshot round-trip | Integrity |
| P1 | Extract **shared chart theme** util | Debt |

## 15.2 Short-term (2–6 weeks)

| Priority | Action |
|----------|--------|
| P1 | Refactor HR store into modules |
| P2 | Introduce **server-persisted workspace** (Supabase tables) for ONE domain pilot (HR or planning) |
| P2 | Unify chart library |

## 15.3 Medium-term (6–12 weeks)

- **Catalog schema** + CRUD APIs + migrations  
- **Allocation POC** on synthetic dimensions (project codes) **without** touching OH core — adapter layer  
- **Measure lineage** extension linking HR cost → offering (paper design first)

## 15.4 Future modules (after foundation)

1. **Catalog** (data model + API + UI)  
2. **Allocation** (rules + traces)  
3. **Profitability** (revenue bridge + COGS)  
4. **Forecasting** (time series + driver-based)

---

# 16. Final Engineering Verdict

## 16.1 How strong is the foundation?

- **For pure financial / workforce math in isolation:** **Strong** (7/10) — engines are readable, bounded, and partially tested.  
- **For enterprise multi-user product:** **Moderate** (4–5/10) — persistence, auth-gated domain APIs, and auditability are not yet first-class.  
- **For cross-module financial truth:** **Moderate** (5/10) — good directional code, but **no single server-backed ledger** tying HR to revenue to catalog.

## 16.2 Ready for next major modules?

**Yes for prototyping** next modules **behind feature flags** with **clearly scoped pilots**.  
**Not fully ready** for “production allocation + profitability” **without** investing in **data platform, identity, and dimensional modeling**.

## 16.3 Current technical risk level

**Overall: Medium, localized High risks** (client persistence + potential misconfiguration of dev disk API + heuristic analytics).

---

## Appendix A — Key file index (quick navigation)

| Domain | Paths |
|--------|-------|
| HR engine | `src/lib/hr-workforce/oh-engine.ts`, `oh-numerator.ts`, `workforce-cost-engine.ts`, `selectors.ts` |
| HR intelligence | `src/lib/hr-workforce/intelligence/*` |
| HR state | `src/stores/use-hr-workforce-store.ts` |
| HR UI | `src/components/hr-workforce/*` |
| Forecast core | `src/lib/calculations/engine.ts` |
| Planning measures | `src/lib/planning/measures/*` |
| Workspace | `src/stores/use-workspace-store.ts` |
| Auth middleware | `src/middleware.ts` |
| Tests | `src/**/*.test.ts` (~14 files) |

---

## Appendix B — Severity legend

- **Low:** Manageable; fix when touching area  
- **Medium:** Will hurt velocity or correctness if ignored through next phase  
- **High:** Likely blocks enterprise rollout or creates serious bugs  
- **Critical:** Security/data-loss/legal exposure if triggered  

---

*End of report. This document is an engineering assessment based on static codebase review; runtime profiling and security penetration testing were not executed as part of this audit.*
