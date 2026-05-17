# Implementation Phases

**Status:** Execution roadmap with gates and audit checklist  
**Related:** [MASTER_VISION.md](./MASTER_VISION.md) · [FUTURE_MODULES.md](./FUTURE_MODULES.md)

---

## 1. Phase summary

| Phase | Goal | Key outcomes | Depends on |
|-------|------|--------------|------------|
| **0** | Governance docs | 12 docs + this checklist | None |
| **1** | Tenant spine | `tenantId` in session; APIs require org; RLS aligned | MULTI_TENANT, PERMISSION, DATA_OWNERSHIP |
| **2** | Server persistence | HR + service catalog APIs; deprecate client-only SOA | Phase 1 |
| **3** | KPI engine v1 | Registry DB; bridge from `MEASURE_CATALOG`; actuals stub | Phase 2 |
| **4** | Commercial Calculator | UI + API; snapshots in/out; not proposals | Phase 2–3 |
| **5** | Event bus + audit | Domain events; notification rules; emitters | Phase 1–2 |
| **6** | AI orchestration v1 | Tool registry; reactive Q&A with lineage | Phase 5 |
| **7** | Actuals + PvA | Sheets/API ingest; executive wired to facts | Phase 3 |
| **8** | CRM / workflow / incentives | Per FUTURE_MODULES | Phases 1–7 |

**Phase 0 status:** Complete (governance suite in `docs/`).

---

## 2. Phase 0 — Governance documentation ✅

| Deliverable | Location |
|-------------|----------|
| Master vision | [MASTER_VISION.md](./MASTER_VISION.md) |
| Principles | [PLATFORM_PRINCIPLES.md](./PLATFORM_PRINCIPLES.md) |
| Governance rules | [GOVERNANCE_RULES.md](./GOVERNANCE_RULES.md) |
| Boundaries | [SYSTEM_BOUNDARIES.md](./SYSTEM_BOUNDARIES.md) |
| Data ownership | [DATA_OWNERSHIP.md](./DATA_OWNERSHIP.md) |
| Multi-tenant | [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) |
| Permissions | [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) |
| KPI engine | [KPI_ENGINE_ARCHITECTURE.md](./KPI_ENGINE_ARCHITECTURE.md) |
| Events | [EVENT_SYSTEM_ARCHITECTURE.md](./EVENT_SYSTEM_ARCHITECTURE.md) |
| AI vision | [AI_ORCHESTRATION_VISION.md](./AI_ORCHESTRATION_VISION.md) |
| Future modules | [FUTURE_MODULES.md](./FUTURE_MODULES.md) |
| This roadmap | [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) |
| Master report link | [PLATFORM_ARCHITECTURE_MASTER_REPORT.md](../PLATFORM_ARCHITECTURE_MASTER_REPORT.md) |

**Gate:** Stakeholder review — Organization vs HrBusinessUnit naming ([DATA_OWNERSHIP.md](./DATA_OWNERSHIP.md)).

---

## 3. Phase 1 — Tenant spine

**Pre-flight audit:** [PHASE_1_AUDIT.md](./PHASE_1_AUDIT.md) — auth/session, Supabase, localStorage inventory, breakage matrix, migration strategy (complete).

**Post-implementation audit:** [PHASE_1_POST_IMPLEMENTATION_AUDIT.md](./PHASE_1_POST_IMPLEMENTATION_AUDIT.md) — pass/fail vs governance, confidence scores, Phase 2 prerequisites.

**Implemented (code):**

- `src/server/tenant/context.ts` — `getTenantContext()` / `requireTenantContext()`
- Active org httpOnly cookie `efp-active-org` — `POST /api/tenant/switch`, `GET /api/tenant/context`
- Planning APIs require tenant; `loadPlanningWorkspace(organizationId)` (no `orgs[0]`)
- `GET /api/org/hr-catalog` read-only; migration `005_hr_workforce_catalog.sql`
- Dev bypass: `DEV_TENANT_ID` (non-production only)

**Outcomes:**

- Session includes `organizationId`, roles, optional `businessUnitIds`.  
- API routes reject missing/invalid tenant.  
- RLS policies verified with integration tests.  
- Dev bypass documented and disabled in prod.

**Not in scope:** Rewriting OH/cost/pricing engines.

**Gate:** Phase 1 checklist in [PHASE_1_AUDIT.md](./PHASE_1_AUDIT.md) §16 + tenant/permission items from architecture audit checklist (below).

---

## 4. Phase 2 — Server persistence (economics)

**Status:** Documentation complete — implementation not started.

**Design suite:**

| Document | Scope |
|----------|--------|
| [PHASE_2_ARCHITECTURE.md](./PHASE_2_ARCHITECTURE.md) | JSONB catalogs, layers, boundaries, proposed migration `006` |
| [PHASE_2_MIGRATION_STRATEGY.md](./PHASE_2_MIGRATION_STRATEGY.md) | Risks, stages 2.0–2.6, rollback, dual-write, ID policy |
| [PHASE_2_API_PLAN.md](./PHASE_2_API_PLAN.md) | GET/PUT routes, DTOs, validation, errors |
| [PHASE_2_RLS_TEST_PLAN.md](./PHASE_2_RLS_TEST_PLAN.md) | Live Supabase denial matrix + CI |
| [PHASE_2_STATE_MANAGEMENT_PLAN.md](./PHASE_2_STATE_MANAGEMENT_PLAN.md) | Zustand, namespaced keys, hydrate/sync, org switch |

**Prerequisites:** [PHASE_1_POST_IMPLEMENTATION_AUDIT.md](./PHASE_1_POST_IMPLEMENTATION_AUDIT.md) — tenant spine, global `localStorage` SOA called out.

**Outcomes:**

- HR workforce + service catalog CRUD via org-scoped API.  
- Migration path from `efp-hr-workforce` / `efp-service-architecture-v1`.  
- Client becomes cache, not SOA.

**Gate:** No unscoped writes; BU validation on template save; RLS matrix in [PHASE_2_RLS_TEST_PLAN.md](./PHASE_2_RLS_TEST_PLAN.md) green before `server_authoritative` (stage 2.6).

---

## 5. Phase 3 — KPI engine v1

**Outcomes:**

- KPI registry tables + RLS.  
- Import/sync from `MEASURE_CATALOG`.  
- Executive dashboard reads via executor.  
- Actuals stub table for dev.

**Gate:** No duplicate formulas in UI; parity tests green.

---

## 6. Phase 4 — Commercial Calculator

**Outcomes:**

- Module UI under dedicated routes.  
- Consumes cost + commercial snapshots.  
- Versioned calculator runs.

**Gate:** No proposal PDF; no CRM scope.

---

## 7. Phase 5 — Event bus + audit

**Outcomes:**

- Outbox + `domain_events`.  
- Emitters on HR + service server mutations.  
- Audit read model.

**Gate:** Idempotent handlers tested.

---

## 8. Phase 6 — AI orchestration v1

**Outcomes:**

- Tool registry.  
- Reactive assistant with lineage citations.  
- Tier gating hook.

**Gate:** Tenant-safe retrieval only; no write tools without capability.

---

## 9. Phase 7 — Actuals + planned vs actual

**Outcomes:**

- Ingest pipeline (Sheets/API).  
- Facts store.  
- Executive PvA views.

**Gate:** KPI alerts fire on real actuals in staging.

---

## 10. Phase 8 — CRM, workflow, incentives, proposals

**Outcomes:** Per [FUTURE_MODULES.md](./FUTURE_MODULES.md) — separate PRs per module where possible.

**Gate:** Each module passes full audit checklist.

---

## 11. Architecture audit checklist

Use **before promoting any phase** to complete:

- [ ] **Tenant:** Every read/write includes `organization_id` (or explicit dev bypass).  
- [ ] **BU:** Cross-BU data access denied at API + UI for service allocations and HR roles.  
- [ ] **Engine purity:** New business rules in `src/lib/*`, not in React components.  
- [ ] **Versioning:** Formula/snapshot bumps documented (`engineVersion` / `formulaVersion` pattern from HR).  
- [ ] **Adapter:** Cross-module links use bridge types only (no store-to-store imports).  
- [ ] **KPI:** New dashboard metrics registered in KPI/measure catalog with lineage.  
- [ ] **Events:** State-changing actions emit domain events (after Phase 5).  
- [ ] **Tests:** Vitest for engines; integration tests for API + RLS.  
- [ ] **Docs:** Update master report companion table + this file phase status.  
- [ ] **i18n:** New UI strings in en + ar.  
- [ ] **No scope creep:** Proposal PDF / full CRM not bundled into calculator phase.

---

## 12. Decision log

| Date | Decision | Status |
|------|----------|--------|
| 2026-05-17 | Phase 0 governance docs authored | Done |
| 2026-05-17 | Phase 1 pre-implementation audit ([PHASE_1_AUDIT.md](./PHASE_1_AUDIT.md)) | Done |
| 2026-05-17 | Phase 1 tenant spine code (context, APIs, hr_workforce_catalog) | Done |
| 2026-05-17 | Phase 1 post-implementation audit ([PHASE_1_POST_IMPLEMENTATION_AUDIT.md](./PHASE_1_POST_IMPLEMENTATION_AUDIT.md)) | Done |
| TBD | `hr_business_units` table naming | Pending stakeholder |
| TBD | localStorage migration strategy (dual-write vs import) | Pending |

---

## 13. Owners (fill in)

| Phase | Owner | Target date |
|-------|-------|-------------|
| 1 | _TBD_ | _TBD_ |
| 2 | _TBD_ | _TBD_ |
| 3 | _TBD_ | _TBD_ |
| 4 | _TBD_ | _TBD_ |
| 5 | _TBD_ | _TBD_ |
| 6 | _TBD_ | _TBD_ |
| 7 | _TBD_ | _TBD_ |
| 8 | _TBD_ | _TBD_ |

---

## 14. Exact next steps (post Phase 0)

1. Stakeholder review of governance suite + Organization vs HrBusinessUnit.  
2. Phase 1 spike: tenant context middleware + read-only org-scoped HR catalog API (design in MULTI_TENANT + PERMISSION).  
3. Do **not** refactor engines or merge CRM into service module until Phase 8.  
4. Update phase status rows in this document as phases complete.

---

*Phase 0 complete — proceed to Phase 1 only after stakeholder sign-off.*
