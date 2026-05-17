# ZAN / AMD CRM Sample — Workbook Reverse-Engineering & Integration Plan

This document is the **pre-implementation analysis** requested before evolving the MVP. It is derived from parsing:

`c:\Users\amrab\Downloads\ZAN _ AMD - CRM -Sample.xlsx`

(Sheet: **LOTF 2026 Sales Forecast**, range **A1:AH179**, **34** columns, **179** rows, **101** merged regions, **661** formula cells.)

---

## 1) Workbook analysis (what the model actually is)

### Purpose

A **single integrated planning sheet** that combines:

- **Strategic sales / BD targets** (biddings per day, per quarter, collections vs biddings).
- **Financial targets**: fixed costs + incentives, **NP target %**, **sales target (SAR)**, **NP target (SAR)**, **ROI**.
- **Two named scenarios** (at least in the sampled logic):
  - **Target Scenario / Optimal** (e.g. NP target 20%, sales target ~6.4M SAR).
  - **Break-Even / Survival** (NP target 0%, lower sales target, NP SAR 0).
- **Deal-size taxonomy** (Tiny / Standard / Big / Mega) with Arabic class labels (A–D) and **pipeline posture** labels (Pipeline / Cash flow, استقرار, Profit Engine, Growth + Safety).
- **Revenue stream × deal size matrix**: each stream has up to **four rows** (one per deal tier) with **contribution margin %**, **% mix within stream**, and **financial decomposition** (value / cost / profit per stream and per deal size).
- **Market split** across **Governmental / Private / Semi Governmental / Nonprofit** (percent columns).
- **Operational funnel**: **Bidding** counts/rates, **Conversion %**, **Awarded** (weighted through quarters **Q1–Q4**).
- **Seasonality / demand calendar**: Arabic named occasions/events across columns (used as planning dimensions, not just labels).

### Layout pattern (important for UI matrix design)

- **Merged blocks** (101 merges): classic **Excel presentation layout** — labels span multiple rows; financial grids are **block-structured** rather than a single flat fact table.
- **Anchor constants** appear as inputs (e.g. **Fixed Costs + Incentives** in the sheet area around column J).
- **Scenario columns** (e.g. M/N/O) pair **NP target %**, **Sales target**, **NP target currency** per scenario row.

---

## 2) Planning architecture (logical modules)

| Module | Role in workbook | App counterpart (additive) |
|--------|------------------|----------------------------|
| **A. Scenario & targets** | M7/M8, N7/N8, O7/O8; ROI M3 | `scenarios` + `scenario_assumptions` (JSON or typed columns) + derived KPI snapshots |
| **B. Cost base** | Fixed costs + incentives (J7 area) | `companies.fixed_costs_monthly` (+ incentives as line item or `metadata`) |
| **C. Blended margin engine** | D16 weighted average across tier blocks using E-weights | `lib/planning/blended-margin.ts` fed by **stream×tier** rows |
| **D. Sales target engine** | `N7 = J7/($D$16-M7)` | Already aligned with app: `fixed / (CM − NP_target)` — **must use workbook’s D16 definition** (weighted), not a single company-level CM only |
| **E. NP currency bridge** | `O7 = N7*D16-J7` | Derived measure: revenue-at-target × blended margin − fixed (validate naming vs “NP target SAR” label) |
| **F. Revenue grid** | G17 references N7; G18=`$G$17*E18`; sums G17:L17 | `planning_matrix_rows/cells` OR dedicated `revenue_allocation_lines` |
| **G. Deal economics** | H18 uses `MAX($G$18*F18,Q18)` style guards | Row-level **drivers** + **caps/mins** → formula registry (not hardcoded in UI) |
| **H. Pipeline / BD** | R6/R7 `ROUNDUP(SUM(...))`; S6/S7 normalize by time buckets | `opportunities` + **activity cadence** tables (biddings/day, quarterly split) |
| **I. Calendar / seasonality** | Text season drivers across columns | `planning_calendar_events` + optional **weights** per month/quarter |

---

## 3) Database mapping (normalized direction)

> **Principle:** Keep existing tables (`companies`, `revenue_streams`, `scenarios`, `opportunities`, `forecasts`, `planning_matrix_*`) and **extend** with workbook-specific entities. No destructive renames.

### Already close to the workbook

- **`deal_size_tiers`**: maps **Tiny / Standard / Big / Mega** (+ min/max, avg, margin, cycle, weights).
- **`revenue_streams`**: one row per stream — workbook needs **stream × tier sub-rows** → add child table (below).
- **`scenarios`**: add assumptions for **NP target %**, **fixed cost reference**, **scenario type** (optimal / break-even).
- **`opportunities`**: pipeline weighting; extend with **bidding vs collection** if modeled separately.

### Recommended new / extended structures (incremental migrations)

1. **`revenue_stream_deal_tiers`** (or `revenue_stream_lines`)
   - `revenue_stream_id`, `deal_tier_id`
   - `contribution_margin_pct` (column D analog)
   - `mix_pct_within_stream` (column E/F analog — clarify dual % columns in UI vs DB)
   - `value_per_stream`, `value_per_deal`, `cost_per_stream`, `profit_per_stream`… **either** persisted **or** computed-only columns (prefer computed via engine for integrity).

2. **`market_segment_weights`**
   - `company_id` or `stream_line_id`, `segment_code`, `weight_pct`  
   - Maps **Governmental / Private / Semi G. / Nonprofit** columns.

3. **`scenario_financial_targets`**
   - `scenario_id`, `np_target_pct`, `sales_target_amount`, `np_target_amount`, `roi_ratio`, `source_workbook_row` (traceability).

4. **`bidding_cadence`** (BD module)
   - Quarterly totals (workbook `Y15:AB15` uses `$G$17 * Y16` pattern) → store **drivers** (Q1–Q4 %) and **base** (`G17` analog).

5. **`planning_calendar_events`**
   - `organization_id`, `name_ar`, `name_en`, `period_month`, optional `demand_weight`.

6. **`formula_definitions`** (future-proofing the 661 formulas)
   - `id`, `scope` (cell_key), `expression`, `depends_on[]`, `version`  
   - Long-term: compile to TS functions or run in a sandboxed evaluator — **short-term**: implement **critical path** formulas in `lib/planning` with tests matching Excel values.

---

## 4) KPI dependency graph (core chain)

```text
FixedCosts (J7)
    └── BlendedMargin (D16) ←── stream×tier margins (D18:D57) × mix weights (E18:E57 blocks)
            └── SalesTarget (N7) = Fixed / (D16 − NP_target%)
                    └── NP_target_SAR (O7) = N7*D16 − Fixed   (verify vs labels; matches extracted formula)
                            └── ROI (M3) = O7 / J7   (workbook uses O7/J7)
```

Parallel branches:

- **Biddings** aggregates `SUM(R18:R33)` etc. → **capacity** feeds **S6** style normalization.
- **Awarded / conversion** (`T17`, `U17:AB17`) depends on **R17** and **quarter mix row** (`U16:AB16`).

---

## 5) Formula dependency structure (sample of critical formulas)

| Cell | Formula (Excel) | Meaning |
|------|-------------------|---------|
| **N7** | `J7/($D$16-M7)` | **Sales target** from fixed costs, **blended CM**, **NP target** |
| **O7** | `N7*D16-J7` | **NP (currency)** at target revenue |
| **M3** | `O7/J7` | **ROI**-style ratio (NP measure / fixed base) |
| **D16** | long `AVERAGE(D18:D21)*E18 + …` | **Blended contribution margin** across **tier blocks** with **E** weights |
| **G17** | `N7` | Total **target revenue** anchor for grid |
| **G18** | `$G$17*E18` | **Allocate revenue** to line by within-stream mix |
| **H18** | `IF(F18=0,0,MAX($G$18*F18,Q18))` | **Value per deal size** with guard + **MAX** against **Q** driver (ADV/bidding driver column) |
| **M15:P15** | `SUM(M18:M57)` etc. | **Market segment totals** |
| **Y15:AB15** | `$G$17 * Y16` etc. | **Quarterly revenue** from annual target × **quarter %** |

**Implication for the app engine:** the current engine’s **single `contributionMarginPct`** is **not sufficient** — the workbook’s **D16** is a **weighted rollup** over many lines. The platform must compute **blended CM** from **`revenue_stream_deal_tiers`** (or matrix cells) before applying `SalesTarget = Fixed/(CM−NP)`.

---

## 6) Forecast hierarchy

1. **Scenario** (optimal vs break-even…) → sets **NP target %** and possibly other levers.
2. **Company / LOTF unit** → **fixed costs + incentives**.
3. **Blended margin (D16)** → from **all stream×tier rows**.
4. **Top-down targets** → **Sales target**, **NP SAR**, **ROI**.
5. **Allocation layer** → **G18…** splits target across **streams/tiers**.
6. **Market + pipeline** → segment columns + bidding/awarded funnel.
7. **Time** → **Quarter columns (Q1–Q4)** and optional **calendar overlays**.

---

## 7) Scenario logic structure

- **Scenario = named assumption bundle** + optional **type** (`target`, `break_even`, `stress`, …).
- **Overrides** vs baseline:
  - `np_target_pct` (M7/M8)
  - possibly **fixed cost** variant (if survival changes incentives)
  - **mix weights** (E/F) and **tier margins** (D) if scenario changes deal policy
- **Derived outputs**: `sales_target`, `np_amount`, `roi`, quarterly splits, grid totals.
- **Snapshots**: already started with `scenario_snapshots` — store **full computed state** JSON for audit/compare.

---

## 8) Safe integration strategy (matches your constraints)

1. **Freeze** current UX routes (`/[locale]/…`) and **additive** migrations only.
2. Implement **`computeBlendedMargin()` + `computeTargetsFromWorkbook()`** in `src/lib/planning/` with **unit tests** using values extracted from this file (golden numbers from N7/O7/D16 etc.).
3. **Persist** stream×tier lines in PostgreSQL; **sync** import path: optional “Import workbook” pipeline (phase later) that maps sheet → normalized tables.
4. **Matrix UI**: render **logical blocks** (stream groups × tier rows) with **frozen headers** — mirror Excel **behavior**, not necessarily merged cell cosmetics.
5. **Extend** `/api/planning/*` to read/write new tables without removing existing workspace endpoint.

---

## 9) File hygiene

- A machine-local dump `workbook-dump.json` was generated during analysis and is listed in **`.gitignore`** so it is not committed.

---

## 10) Next implementation slice (recommended order)

1. ✅ **`revenue_stream_deal_tier_lines`** migration (`003_revenue_stream_deal_tiers.sql`) + RLS.
2. ✅ **Engine** `src/lib/planning/workbook-engine.ts`: blended margin (mix + workbook-block), sales target, NP at target, ROI; **`npm run test`** golden values vs LOTF N7/O7/M3.
3. **API / UI (next)**: CRUD for tier lines; optional `GET` summary that returns `computeWorkbookTargets` for selected scenario.
4. **Import**: map sheet rows → `revenue_stream_deal_tier_lines` (iterative).

### Commands

```bash
npm run test    # vitest — workbook golden tests
```

---

*Document version: generated from automated XLSX parse + formula extraction. Numeric labels (e.g. J7) refer to the workbook’s Excel addresses for traceability.*
