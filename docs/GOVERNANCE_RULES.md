# Governance Rules

**Status:** How we build and change the platform safely  
**Related:** [PLATFORM_PRINCIPLES.md](./PLATFORM_PRINCIPLES.md) · [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md)

---

## 1. Purpose

Governance rules turn principles into **reviewable process** — especially as the codebase moves from client-heavy demo to multi-tenant SaaS.

---

## 2. Change control

| Change type | Requirement |
|-------------|-------------|
| New platform spine (tenant, auth, events) | Doc update in affected architecture file **before** merge |
| New cross-module dependency | Adapter type + boundary check in [SYSTEM_BOUNDARIES.md](./SYSTEM_BOUNDARIES.md) |
| Formula / engine behavior change | Version bump (`engineVersion`, `formulaVersion`) + Vitest |
| Breaking persist key shape | Migration note in PR + optional one-time migrator |
| Scope expansion (e.g. CRM in calculator PR) | Rejected — split PR per [FUTURE_MODULES.md](./FUTURE_MODULES.md) |

**Implemented today:** Informal; strong Vitest on engines.  
**Target:** Phase gate checklist in [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) required before phase promotion.

---

## 3. Documentation-first (platform spine)

For Phases 1–5 in [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md):

1. Update architecture doc(s) with **Implemented today** / **Target** delta.  
2. Stakeholder sign-off on naming (especially Organization vs HrBusinessUnit).  
3. Implement with feature flags or dev bypass where needed.  
4. Update [PLATFORM_ARCHITECTURE_MASTER_REPORT.md](../PLATFORM_ARCHITECTURE_MASTER_REPORT.md) companion row.

Module-only features inside an existing boundary may ship with module doc only.

---

## 4. Formula and engine versioning

| Rule | Detail |
|------|--------|
| Pure functions | All new business logic in `src/lib/**` |
| Version metadata | Outputs that persist or cross modules include version fields |
| No silent changes | Changing OH allocation or pricing model defaults = version bump |
| Tests | Vitest required for engine changes; parity tests for measure bridge |

**Pattern (HR):** snapshot slice stores `engineVersion` / `formulaVersion` — reuse for commercial and service decision records.

---

## 5. Adapter-only cross-module joins

Allowed:

```text
HR store → deriveHrWorkforceModel → ServiceCostBaselineSnapshot → CommercialPricingSnapshot
```

Not allowed (new code):

```text
use-service-architecture-store imported inside use-hr-workforce-store
```

Use dedicated hooks or application services that map to bridge types.

---

## 6. Test gates

| Layer | Gate |
|-------|------|
| Engines | Vitest unit tests mandatory |
| Adapters | Contract tests on snapshot shapes |
| API + RLS | Integration tests (target Phase 1+) |
| UI | Critical path manual or E2E (phased) |
| i18n | New keys in `messages/en.json` and `messages/ar.json` |

Current baseline: 32+ Vitest files on HR, service, sales plan, measures — **maintain or increase** on touched engines.

---

## 7. Pull request checklist (minimum)

- [ ] Tenant/BU scope considered (or N/A with reason)  
- [ ] No duplicate KPI/measure formulas outside catalog  
- [ ] Engine purity preserved  
- [ ] Adapter used for cross-module data  
- [ ] en + ar strings for new UI  
- [ ] Docs updated if boundary or SOA changed  
- [ ] No scope creep from active phase definition  

Full audit list: [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) § Architecture audit checklist.

---

## 8. Security and secrets

- Never commit `.env`, service keys, or customer exports.  
- RLS policies changed only with integration tests.  
- AI tools (future): no PII in logs; tenant-scoped retrieval only.

---

## 9. Architecture decision records (lightweight)

Significant decisions (e.g. dual-write migration, event bus technology) get a short ADR:

- **Context** — problem  
- **Decision** — what we chose  
- **Consequences** — tradeoffs  
- **Phase** — when it lands  

Store in `docs/adr/` when that folder is introduced; until then, append to [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) decision log section.

---

## 10. Implemented today vs target

| Practice | Today | Target |
|----------|-------|--------|
| Doc-first spine | This governance suite | Enforced in PR template |
| Version bumps | HR snapshots | All economics modules |
| Phase gates | Informal | Checklist per phase |
| ADRs | None | `docs/adr/` for major forks |

---

*Engineers may propose rule changes via PR to this file with founder/architect approval.*
