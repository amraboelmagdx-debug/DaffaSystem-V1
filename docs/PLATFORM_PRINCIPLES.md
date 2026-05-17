# Platform Principles

**Status:** Non-negotiable architecture rules  
**Related:** [MASTER_VISION.md](./MASTER_VISION.md) · [SYSTEM_BOUNDARIES.md](./SYSTEM_BOUNDARIES.md) · [GOVERNANCE_RULES.md](./GOVERNANCE_RULES.md)

---

## 1. Purpose

These principles protect what already works in the codebase while enabling evolution to multi-tenant SaaS. Any change that violates a principle requires an explicit architecture decision and doc update.

---

## 2. Core principles

### P1 — Modularity over monolith

Each major domain (HR, service architecture, cost simulation, commercial pricing, sales plan, executive workspace) owns its **domain model**, **pure engines**, and **UI**. Cross-domain joins use **adapter types** — never direct store-to-store coupling in new code.

**Implemented today:** `ServiceCatalogSelection`, `CommercialPricingSnapshot`, `ServiceCostBaselineSnapshot`, planning measure bridge.  
**Target:** Application services orchestrate adapters; UI does not import foreign stores except through hooks designed for that boundary.

### P2 — Pure engines, dumb UI

Business rules and formulas live under `src/lib/**` as **pure, testable functions**. React components render state and dispatch actions — they do not embed pricing, OH, or allocation math.

**Evidence:** `deriveHrWorkforceModel`, `simulateServiceDeliveryCost`, `buildCommercialPricingIntelligence`, `evaluateExecutiveWorkspaceMeasures`.

### P3 — Explainability by default

Every derived number should be traceable to inputs (roles, hours, OH factors, pricing model, scenario stack). Snapshots and `engineVersion` / `formulaVersion` patterns are mandatory for persisted economics.

**Implemented today:** HR snapshot slice; commercial/cost run metadata in engine outputs.  
**Target:** Versioned decision records for commercial and service catalog changes.

### P4 — Layer separation (operational ≠ commercial ≠ proposal)

| Layer | Owns |
|-------|------|
| Operational | Delivery cost, role hours, OH-loaded rates |
| Commercial intelligence | Pricing models, risk, margin targets — **not** client-facing quotes |
| Calculator (future) | Quantity, packaging, BD-facing price — still not legal proposal |
| Proposal (future) | Templates, approvals, e-sign |

See [COMMERCIAL_PRICING_INTELLIGENCE_ARCHITECTURE.md](../COMMERCIAL_PRICING_INTELLIGENCE_ARCHITECTURE.md) and [SERVICE_COST_SIMULATION_ARCHITECTURE.md](../SERVICE_COST_SIMULATION_ARCHITECTURE.md).

### P5 — Business unit as operational scope (not tenant)

`HrBusinessUnit` is an **organizational subdivision** for workforce and service template scoping. **Tenant** is `organizations` in Supabase. Never conflate them in APIs or RLS.

See [DATA_OWNERSHIP.md](./DATA_OWNERSHIP.md).

### P6 — Tenant isolation (future mandatory)

All server reads/writes include `organization_id`. Client-only dev mode may bypass with explicit flag — never silent multi-tenant bleed.

### P7 — Single KPI/measure lineage

New dashboard metrics register in the **measure/KPI catalog** with one formula path. No duplicate executive formulas in components.

See [KPI_ENGINE_ARCHITECTURE.md](./KPI_ENGINE_ARCHITECTURE.md) and [ARCHITECTURE-CONVERGENCE-MIGRATION.md](./ARCHITECTURE-CONVERGENCE-MIGRATION.md).

### P8 — Event-ready mutations (phased)

State-changing actions that affect economics, permissions, or KPIs will emit **domain events** once the event spine exists. Design APIs as if events exist even before Phase 5.

### P9 — AI safety and tenancy

AI tools may only access data for the **current tenant** and **authorized BU scope**. No cross-tenant RAG, no silent tool execution on write paths without human approval for high-impact actions.

See [AI_ORCHESTRATION_VISION.md](./AI_ORCHESTRATION_VISION.md).

### P10 — Internationalization

User-facing strings in **English and Arabic** with RTL support via `next-intl`. New modules ship with both locales before release.

### P11 — Preserve strengths, add orchestration

Do not rewrite OH/cost/pricing math without version bumps and migration notes. Add **persistence adapters**, **tenant context**, and **orchestration** around existing engines.

### P12 — Doc-first for platform spine

Tenant, permissions, KPI registry, and event contracts are **documented before** wide code changes. See [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md).

---

## 3. Anti-patterns (reject in review)

| Anti-pattern | Why |
|--------------|-----|
| CRM logic inside service architecture | Wrong boundary |
| Quotation PDF in pricing intelligence module | Belongs in proposal phase |
| `localStorage` as sole source of truth for shared org data | Blocks SaaS |
| Duplicate KPI formulas in page components | Drift and audit failure |
| Store importing another module's store | Use adapters |
| LLM directly mutating catalog without validation | Safety + tenancy |
| Using `organizations.id` as `HrBusinessUnit.id` | Data model corruption |

---

## 4. Implemented today vs target

| Principle | Today | Target |
|-----------|-------|--------|
| Pure engines | Strong | Maintain |
| Adapters | Present for service ↔ cost ↔ commercial | Extend to calculator |
| Tenant isolation | DB schema only | Runtime session + RLS |
| Events | None | Outbox + subscribers |
| AI safety | N/A (stub) | Tool registry + policy |
| BU scoping | HR + service templates | API-enforced BU deny |

---

*Violations should be logged in PR description with planned remediation phase.*
