# Permission Architecture

**Status:** Authorization (AuthZ) model  
**Related:** [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) · [DATA_OWNERSHIP.md](./DATA_OWNERSHIP.md)

---

## 1. Scope

This document defines **who can do what** inside a tenant — distinct from authentication (Supabase Auth / session).

**Implemented today:** `app_role` enum in SQL; **unused by module UIs**. Middleware redirects unauthenticated users when Supabase env is configured.  
**Target:** RBAC at tenant level + optional BU scope for operational modules.

---

## 2. Role model (target mapping)

Map SQL `app_role` (extend as needed) to capabilities:

| Role | Tenant admin | HR master | Service catalog | Cost / commercial | Sales plan | KPI config | Calculator | CRM |
|------|:------------:|:---------:|:---------------:|:-----------------:|:----------:|:----------:|:----------:|:---:|
| `tenant_admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `hr_admin` | — | ✓ | read | read | — | — | — | — |
| `service_admin` | — | read BU | ✓ BU | read | — | — | — | — |
| `commercial_analyst` | — | read | read | ✓ | read | — | ✓ | read |
| `planning_editor` | — | read | read | read | ✓ | read | — | read |
| `kpi_admin` | — | read | read | read | read | ✓ | — | read |
| `member` | — | read* | read* | read* | read* | read | — | read* |

\*Read scope may be BU-limited.

**Implemented today:** None of the above enforced in app code.

---

## 3. Business-unit scoping

| Action | BU rule |
|--------|---------|
| View service template | Template `businessUnitId` must be in user's BU grants (or user is tenant-wide) |
| Edit HR roles for BU | Same |
| Cross-BU allocation in matrix | Deny at API unless `tenant_admin` |
| Executive rollup | Tenant-wide roles see all BUs; BU lead sees one |

Enforcement layers (defense in depth):

1. Postgres RLS (BU column policies)  
2. API handler checks  
3. UI hide/disable (not sufficient alone)

---

## 4. Module capability keys (stable IDs)

Use string capability keys for policy checks and future AI tool allowlists:

```text
hr.workforce.write
hr.business_unit.manage
service.catalog.write
service.template.write.bu:{buId}
cost.simulation.run
commercial.pricing.run
commercial.calculator.write      # future
sales.plan.write
kpi.definition.write
kpi.target.write
executive.workspace.read
crm.opportunity.write            # future
tenant.settings.write
ai.assistant.use
ai.assistant.proactive           # subscription tier
```

---

## 5. Calculator vs admin

| Concern | Rule |
|---------|------|
| Commercial Calculator | `commercial_analyst` + calculator write; cannot edit OH rules |
| Pricing intelligence config | Same or `commercial_analyst` |
| HR OH changes | `hr_admin` only — prevents margin gaming |
| Tenant billing | `tenant_admin` only |

---

## 6. Middleware and route guards (target)

```text
Request → AuthN (session) → resolve tenantId + roles + buGrants
        → route policy (capabilities[])
        → handler
```

Next.js:

- Layout-level guard for `/[locale]/(dashboard)/*`  
- API routes: `requireCapability('service.catalog.write')`  
- Engines: no auth logic inside `src/lib`

**Implemented today:** Optional redirect in middleware when env present.

---

## 7. AI and permissions (future)

- Tool registry declares required capabilities per tool.  
- Proactive jobs run as **system principal** with tenant-scoped read, never cross-tenant.  
- Write tools (e.g. "adjust target") require explicit user capability + confirmation.

See [AI_ORCHESTRATION_VISION.md](./AI_ORCHESTRATION_VISION.md).

---

## 8. Implemented today vs target

| Item | Today | Target |
|------|-------|--------|
| `app_role` in DB | Yes | Wired to session |
| Module guards | No | Capability middleware |
| BU deny | UI hints only | API + RLS |
| Audit on deny | No | Event log (Phase 5) |
| Calculator separation | N/A | Role matrix above |

---

## 9. Phase 1 deliverables (with multi-tenant)

1. Session payload: `{ userId, organizationId, roles[], businessUnitIds[] }`.  
2. Deny cross-org API with test.  
3. Document default role assignment for new org signup.

---

*Role names may be adjusted at stakeholder review — update this table when `app_role` enum changes.*
