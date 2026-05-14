# Service Architecture Validation & Stress Testing Report

**Scope:** Validation of the implemented Service Architecture foundation (domain model, selectors, import foundation, HR role integration shape, Sales Plan bridge types).  
**Out of scope:** Pricing, profitability, forecasting, allocation engines, scheduling.  
**Method:** Code review of `src/types/service-architecture.ts`, `src/lib/service-architecture/*`, `src/stores/use-service-architecture-store.ts`, Vitest stress fixtures, and executable stress tests.  
**Operational fixture:** `src/lib/service-architecture/operational-stress-catalog.ts` — deterministic catalog with **4 families** (Branding, Strategy, Motion Graphics, Communications), **4 tier codes per family** (Tiny, Standard, Big, Mega), **15 service templates** across **4 synthetic business units**, shared **global delivery phases**, **tier-dependent phase depth**, **role allocations** keyed by stable `jobRoleId`.  
**Date:** 2026-05-14  

---

## 1. Architecture strengths

- **Clear hierarchy** that matches operational reality: `ServiceFamily` → `ServiceTemplate` (single `businessUnitId`) → `ServiceTier` (scoped by `serviceFamilyId`) → `ServiceTemplateTier` (sellable / plannable combinations) → ordered `ServiceTemplateTierPhase` → `ServiceDeliverable` / `ServiceRoleAllocation`.
- **Family-scoped tiers** are modeled correctly: each tier row carries `serviceFamilyId`, so labels like “Tiny” can repeat across families without implying comparable scope (validated in tests: distinct tier ids for Tiny in Branding vs Motion).
- **Stable HR references:** `ServiceRoleAllocation.jobRoleId` points at `JobRole.id`, not display names — resilient to renames and HR edits.
- **Business unit isolation for staffing:** `getJobRolesForTemplateBusinessUnit` enforces dropdown data from the template’s BU only; stress tests cover cross-BU leakage.
- **Template–tier family integrity:** `validateTemplateTierFamilyConsistency` blocks impossible links when tier and template belong to different families (store uses this on `addServiceTemplateTier`).
- **Sales Plan readiness shape:** `ServiceCatalogSelection` (`serviceTemplateId` + `tierId`) is minimal and stable for future dropdowns and costing joins.
- **Pure domain helpers:** validation and selectors live under `src/lib/service-architecture/` without UI or pricing coupling.
- **Import foundation** normalizes codes, dedupes entities, and **detects** cross-family tier code collisions and BU drift on template codes (see import stress tests).

---

## 2. Architecture weaknesses

- **No first-class “optional” or “parallel” phase semantics:** Optional delivery is only expressible by *omitting* `ServiceTemplateTierPhase` rows; parallel tracks are not modeled (workflow is a single ordered list per template×tier).
- **Sort order collisions:** `sortOrder` is validated as a non-negative number, not as **unique** per `serviceTemplateTierId`. Duplicate `sortOrder` values sort stably only by array tie-break — operational ordering can become ambiguous (see `edge-case-stress.test.ts`).
- **No uniqueness on role allocations:** Multiple rows may reference the same `jobRoleId` for the same phase; the domain neither forbids nor merges them — capacity rollups must be careful to sum hours.
- **Deliverables are embedded, not referenced:** Each `ServiceDeliverable` is tied to a concrete `serviceTemplateTierPhaseId`; reuse across templates is copy/paste at the data level, not a shared deliverable definition.
- **Rehydrate normalization mutates meta:** `normalizeCatalogState` in the store bumps `version`/`updatedAt` on every persist merge — surprising for “read-only” reload semantics and audit trails (documented risk, not a domain bug per se).
- **Runtime enforcement of BU ↔ role:** Selectors gate UI options; the store does not re-validate that `jobRoleId` belongs to the template’s BU on every `addServiceRoleAllocation` (a malicious or buggy client could persist inconsistent rows).

---

## 3. Scalability risks

- **Cartesian growth:** `ServiceTemplateTier` × `ServiceTemplateTierPhase` × allocations × deliverables grows quickly for large catalogs (many templates × four tiers × many phases). Indexes in memory are fine today; future DB backing will need composite keys and partial indexes on hot paths (`serviceTemplateTierId`, `jobRoleId`).
- **Global phase catalog contention:** One `DeliveryPhase` table for the whole org scales for naming reuse but can become a **bottleneck for governance** (who owns renaming “Design”?). Versioning exists per entity but not cross-entity “phase definition versions.”
- **Wide-row import:** Current `buildServiceCatalogImportPlan` expects **every row** to carry family, tier, template, BU, phase, sort, and deliverable — heavy for sparse Excel sheets; scaling imports may require a staged multi-sheet or relational import pipeline.
- **Matrix UX complexity:** As template×tier×phase×role rows multiply, UI and mental load increase; future list/virtualization and bulk edit patterns will matter.

---

## 4. Reusability findings

- **Strong:** `DeliveryPhase` as a global reusable catalog; tier codes reused *within* a family; `ServiceCatalogSelection` reusable for Sales Plan and costing entry points.
- **Medium:** `ServiceTemplateTier` cleanly separates “which tiers this template offers” from the family’s tier ladder.
- **Weak:** Deliverable reuse is **not** shared — same client output (e.g. “Brand Guidelines”) instantiated per phase path. That is acceptable for Phase 1 but will duplicate content under heavy template libraries.

---

## 5. Tier model findings

- **Independence of “Tiny” across families:** Confirmed: separate `ServiceTier` ids per family even when `code` and `name` match (`operational-stress-catalog.test.ts`).
- **Effort growth:** The stress fixture encodes **deeper phase ladders** and **higher hour multipliers** for larger tiers on the same template (e.g. Brand Identity Tiny vs Mega); totals increase monotonically in tests — operationally plausible, not a business rule in code.
- **Tier comparability:** The system **does not** assert global comparability — correct. Any future “Mega = 2× Standard” logic belongs in engines, not the catalog schema.
- **Linking flexibility:** Templates may expose a **subset** of family tiers (e.g. Packaging only Big/Mega) — validated via `getTemplateLinkedTiers` expectations.

---

## 6. Delivery phase findings

- **Reusable phases:** Supported via shared `DeliveryPhase` ids referenced by many `ServiceTemplateTierPhase` rows.
- **Phase ordering:** Supported via `sortOrder`; risk when duplicates or gaps exist (gaps are fine; duplicates are not).
- **Phase expansion across tiers:** Stress catalog gives Tiny a short path and Mega a longer path including Animation — matches operational “bigger tier = more production steps.”
- **Optional phases:** Only modeled implicitly (no row). There is no `optional: boolean` or “branch” construct — acceptable for now; limits expressiveness for “Discovery optional if…” workflows without data conventions.
- **Duplication:** Teams may create multiple catalog phases with synonymous names if codes differ — governance process issue, not enforced in schema.

---

## 7. Role allocation findings

- **Granularity:** Hours attach to **template × tier × phase** via `serviceTemplateTierPhaseId` — sufficient for high-level capacity and future costing **if** work breakdown stays phase-aligned.
- **Sub-phase / task risk:** There is **no** task, story, or sub-phase entity. Fine-grained scheduling or granular profitability may eventually need another layer **without** removing phase-level hours (additive model).
- **Role reuse across phases:** Same `jobRoleId` may appear on many phases — realistic.
- **Stability:** `jobRoleId` is the correct long-term key; archived roles are filtered in selectors — allocations to archived roles may still exist in persisted data until manually cleaned.
- **Unrealistic patterns the model allows:** Duplicate rows per role per phase; zero-hour rows if UI allows; no cap against total headcount — engine-level concerns later.

---

## 8. Deliverable findings

- **Phase–deliverable relationship:** Correct: deliverable → `serviceTemplateTierPhaseId` → chain up to template and tier.
- **Client outputs:** Modeled as named artifacts with codes; good for catalogs and import.
- **Reusable deliverable entities (future):** Today deliverables are **embedded definitions**. Evolution toward a `DeliverableDefinition` catalog + join table would reduce duplication; **not recommended as an immediate refactor** — validate in production usage first.

---

## 9. Import findings

- **Strengths:** Code normalization (uppercase), dedupe by codes, preview counts, detection of tier reused across families with conflicting `serviceFamilyCode`, BU mismatch on same `serviceTemplateCode`.
- **Gaps:** `ServiceCatalogImportPlan` **does not include** `ServiceRoleAllocation` or hours — Excel-to-allocations remains a **second pass** or future extension (`import-stress.test.ts` documents this).
- **Ambiguity:** Rows keyed heavily on codes; missing or inconsistent codes fall back to composite keys — can surprise operators if names change between imports.
- **No Excel files in repo:** Stress tests use row-shaped data analogous to flattened sheets; real uploaded workbooks were not available in-repository for binary round-trip testing.

---

## 10. Future readiness assessment

| Future capability | Readiness | Notes |
|-------------------|-----------|--------|
| Costing / rate cards | Medium | Needs rate dimensions keyed by `serviceTemplateTierPhase` + role; catalog ids are sufficient anchors. |
| Forecasting | Medium | Hours exist at phase×role; forecasting may want time-phasing not in schema. |
| Allocation engines | Medium–Low | Phase-level only; engines must aggregate; no dependency graph. |
| Capacity planning | Medium | Sum hours × roles per BU; watch duplicate allocation rows. |
| Sales Plan integration | High | `ServiceCatalogSelection` + existing template/tier ids fit dropdown + stable sync. |

---

## 11. Recommended improvements (incremental; not mandatory immediately)

1. **Uniqueness constraint (soft):** Warn or prevent duplicate `(serviceTemplateTierId, deliveryPhaseId)` joins; optionally unique `(serviceTemplateTierId, sortOrder)`.
2. **Allocation guard:** On `addServiceRoleAllocation` / update, optionally validate `jobRoleId` against HR roles for template BU (dev-only or strict mode flag).
3. **Import v2:** Add optional columns for `jobRoleId` / hours / allocation notes; or a second import type `ServiceCatalogAllocationImportRow`.
4. **Phase governance:** Document naming/code conventions; consider soft-link “phase groups” later instead of rushing schema changes.
5. **Persist merge:** Avoid bumping `version`/`updatedAt` on every rehydrate unless intentional.

---

## 12. Potential future redesign areas (do not implement prematurely)

- **Deliverable definition catalog** + reference joins instead of only embedded rows.
- **Workflow branches / parallel lanes** (e.g. Design A vs Design B) beyond a single ordered list.
- **Sub-phase or work package** layer under `ServiceTemplateTierPhase` for scheduling fidelity.
- **Template variants** (e.g. industry verticals) without duplicating entire template trees.
- **Cross-BU “same service”** today requires **two templates** (one BU each) — acceptable boundary; a future “canonical service + BU overrides” layer would be a larger product decision.

---

## 13. Things that should NOT be changed yet

- **Family-scoped tiers** and the `serviceFamilyId` on `ServiceTier` — core correctness for non-comparable tiers.
- **`ServiceTemplateTier` join** — cleanly separates sales/plan combinations from the family tier ladder.
- **Global `DeliveryPhase` catalog** — good reusability baseline.
- **Stable `jobRoleId` on allocations** — essential for HR drift tolerance.
- **`ServiceCatalogSelection` shape** — keep small and stable for Sales Plan and downstream engines.
- **Separation of engines from catalog** — maintain; do not push costing rules into types.

---

## Appendix: Tests added for this sprint

| File | Intent |
|------|--------|
| `operational-stress-catalog.ts` | Deterministic “real world” catalog builder. |
| `operational-stress-catalog.test.ts` | Counts, tier independence, BU role isolation, phase depth, hour monotonicity, linked tiers. |
| `edge-case-stress.test.ts` | Duplicate `sortOrder`, empty phase list, allocation validation edges. |
| `import-stress.test.ts` | Cross-family tier code, BU drift, wide-row requirement, many deliverables, allocation gap assertion. |

All tests pass together with the existing suite (`npx vitest run`, `npx tsc --noEmit` at report time).
