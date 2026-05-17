# Phase 2 API Plan — Org-Scoped Economics Persistence

**Status:** API contract specification (not implemented)  
**Related:** [PHASE_2_ARCHITECTURE.md](./PHASE_2_ARCHITECTURE.md) · [PHASE_2_MIGRATION_STRATEGY.md](./PHASE_2_MIGRATION_STRATEGY.md) · [src/server/tenant/context.ts](../src/server/tenant/context.ts)

---

## 1. Principles

| Rule | Detail |
|------|--------|
| Session-bound tenant | `organizationId` from `requireTenantContext()` — **never** from request body or query |
| No cross-module writes in one route | HR and Service are separate endpoints |
| Validation ≠ engines | Zod shape + reference checks in `src/server/validation/**` |
| Idempotent reads | GET safe; PUT upserts by `organization_id` |
| Errors | 401 auth, 403 membership, 404 missing row, 409 concurrency (optional), 422 validation |

---

## 2. Route inventory

### 2.1 HR Workforce catalog

| Method | Path | Phase | Status today |
|--------|------|-------|--------------|
| GET | `/api/org/hr-catalog` | 1 | Implemented (read-only) |
| PUT | `/api/org/hr-catalog` | 2.2 | **New** |
| POST | `/api/org/hr-catalog/import/dry-run` | 2.2+ | **New** (optional) |

### 2.2 Service Architecture catalog

| Method | Path | Phase | Status today |
|--------|------|-------|--------------|
| GET | `/api/org/service-catalog` | 2.3 | **New** |
| PUT | `/api/org/service-catalog` | 2.4 | **New** |
| POST | `/api/org/service-catalog/import/dry-run` | 2.4+ | **New** (optional) |

### 2.3 Unchanged (Phase 2)

| Route | Note |
|-------|------|
| `GET/POST /api/tenant/context`, `/api/tenant/switch` | Phase 1 |
| `/api/planning/*` | Planning domain; not economics catalogs |
| `/api/dev/*` | Dev only; must become org-scoped or disabled |
| `/api/assistant` | Out of scope |

---

## 3. Authentication and tenant context

Every handler starts with:

```typescript
const tenant = await requireTenantContext();
// tenant.organizationId — sole scope key
```

- Uses [organization_members](../supabase/migrations/001_initial_schema.sql) via Phase 1 loader.
- Dev bypass: `DEV_TENANT_ID` only when not production ([context.ts](../src/server/tenant/context.ts)).

**Cookies:** Session auth cookies + `efp-active-org` for active org (not a substitute for membership checks on switch).

---

## 4. GET `/api/org/hr-catalog`

### 4.1 Request

- No body.
- Credentials: include (session).

### 4.2 Response 200

```typescript
{
  catalog: HrWorkforceCatalogPayload; // mirrors store partialize
  meta: {
    organizationId: string;
    engineVersion: string | null;
    updatedAt: string; // ISO
    updatedBy?: string | null;
  }
}
```

### 4.3 Response 404

No row for org — client uses namespaced local or empty seed.

### 4.4 Phase 2 enhancements

- `ETag` header: `"${updatedAt}-${engineVersion}"` (optional).
- `Cache-Control: private, no-store`.

---

## 5. PUT `/api/org/hr-catalog`

### 5.1 Request body

```typescript
{
  catalog: HrWorkforceCatalogPayload;
  engineVersion?: string; // defaults to HR_WORKFORCE_ENGINE_VERSION constant
  expectedUpdatedAt?: string; // optional optimistic lock
}
```

**Must not include** `organizationId` in body.

### 5.2 Payload shape (`HrWorkforceCatalogPayload`)

Aligned with [use-hr-workforce-store partialize](../src/stores/use-hr-workforce-store.ts):

```typescript
{
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  roles: JobRole[];
  hrGlobalSettings: HrGlobalSettings;
  ohManualByBusinessUnitId: Record<string, OhManualSettings>;
  importLogs?: HrImportLogEntry[];
  snapshots?: HrSnapshotRecord[];
}
```

**Excluded** (ephemeral — not persisted): import session fields, `lastSnapshotRestoreError`.

### 5.3 Validation (server)

| Check | Layer |
|-------|-------|
| Zod schema matches types in [hr-workforce.ts](../src/types/hr-workforce.ts) | `hr-catalog-schema.ts` |
| Array lengths / required fields | Zod |
| `department.businessUnitId` references existing BU | structural validator |
| `role.businessUnitId` consistent with department | structural validator |
| OH map keys ⊆ BU ids | structural validator |

**Not validated on server:** OH math, loaded rates — engines on client.

### 5.4 Response 200

```typescript
{
  meta: {
    organizationId: string;
    engineVersion: string | null;
    updatedAt: string;
  }
}
```

### 5.5 Errors

| Status | Condition |
|--------|-----------|
| 401 | No tenant context |
| 403 | Not a member (should not happen if context ok) |
| 409 | `expectedUpdatedAt` mismatch (optional Phase 2) |
| 422 | Zod / structural validation failed |

### 5.6 Database

Upsert into `hr_workforce_catalog` on `organization_id`; set `updated_by = tenant.userId`.

**RLS:** Add INSERT/UPDATE policies for `organization_members` (Phase 1 is SELECT-only).

---

## 6. GET `/api/org/service-catalog`

### 6.1 Response 200

```typescript
{
  catalog: ServiceArchitectureCatalogPayload;
  meta: {
    organizationId: string;
    engineVersion: string | null;
    updatedAt: string;
  }
}
```

### 6.2 Payload shape

Aligned with [use-service-architecture-store partialize](../src/stores/use-service-architecture-store.ts):

```typescript
{
  serviceFamilies: ServiceFamily[];
  serviceTiers: ServiceTier[];
  serviceTemplates: ServiceTemplate[]; // includes businessUnitId
  serviceTemplateTiers: ServiceTemplateTier[];
  deliveryPhases: DeliveryPhase[];
  serviceTemplateTierPhases: ServiceTemplateTierPhase[];
  serviceDeliverables: ServiceDeliverable[];
  serviceRoleAllocations: ServiceRoleAllocation[];
}
```

---

## 7. PUT `/api/org/service-catalog`

### 7.1 Request body

```typescript
{
  catalog: ServiceArchitectureCatalogPayload;
  engineVersion?: string;
  expectedUpdatedAt?: string;
}
```

### 7.2 Validation (server)

| Check | Layer |
|-------|-------|
| Zod schema for service entities | `service-catalog-schema.ts` |
| **BU reference integrity** | Load HR catalog row for same org; every `serviceTemplates[].businessUnitId` ∈ HR `businessUnits[].id` |
| Role allocation references | Template/tier/phase ids exist in payload |
| Import plan rules (if import API) | Reuse [import-plan.ts](../src/lib/service-architecture/import-plan.ts) on server |

```typescript
// Conceptual
function validateBuReferences(
  serviceCatalog: ServiceArchitectureCatalogPayload,
  hrCatalog: HrWorkforceCatalogPayload
): ValidationIssue[] { /* ... */ }
```

### 7.3 Errors

Same as HR PUT, plus:

| Status | Condition |
|--------|-----------|
| 422 | `businessUnitId` not found in HR catalog |
| 424 | HR catalog missing when SA PUT requires BU validation (Failed Dependency) |

**Order on org switch:** Hydrate HR before SA; SA PUT may fetch HR row internally if SA hydrate skipped.

---

## 8. Import dry-run APIs (optional Phase 2.2 / 2.4)

### POST `/api/org/hr-catalog/import/dry-run`

- Body: `{ rows: string[][] }` or multipart file.
- Runs [import-dry-run.ts](../src/lib/hr-workforce/import-dry-run.ts) against **server-loaded** or request-provided baseline.
- Does **not** commit — returns `ImportPlanResult`.
- `requireTenantContext()` required.

### POST `/api/org/service-catalog/import/dry-run`

- Runs [import-plan.ts](../src/lib/service-architecture/import-plan.ts).
- Validates `businessUnitId` column against HR catalog from DB.

---

## 9. Server module layout (proposed)

```
src/server/
  hr/
    load-hr-catalog.ts      # exists
    save-hr-catalog.ts      # new
  service/
    load-service-catalog.ts # new
    save-service-catalog.ts # new
    validate-bu-references.ts
  validation/
    hr-catalog-schema.ts
    service-catalog-schema.ts
src/app/api/org/
  hr-catalog/route.ts       # extend PUT
  service-catalog/route.ts  # new
```

---

## 10. Error response envelope

```typescript
{
  error: string;
  details?: unknown; // Zod flatten or validation issues[]
  code?: "VALIDATION" | "CONFLICT" | "HR_CATALOG_MISSING";
}
```

Use [tenantErrorResponse](../src/server/tenant/errors.ts) for auth errors.

---

## 11. Testing plan (API layer)

| Test | Type |
|------|------|
| PUT HR valid payload | Unit + integration |
| PUT SA invalid BU | Unit — 422 |
| PUT without auth | Integration — 401 |
| Cross-tenant PUT | Integration — RLS deny |
| Payload === partialize output | Contract snapshot |

Live RLS: [PHASE_2_RLS_TEST_PLAN.md](./PHASE_2_RLS_TEST_PLAN.md).

---

## 12. Governance cross-reference

| Rule | API compliance |
|------|----------------|
| [GOVERNANCE_RULES.md](./GOVERNANCE_RULES.md) versioning | `engine_version` on PUT when shape changes |
| [DATA_OWNERSHIP.md](./DATA_OWNERSHIP.md) | Separate endpoints per domain |
| [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) §4 gate | BU validation on service PUT |

---

*Client orchestration: [PHASE_2_STATE_MANAGEMENT_PLAN.md](./PHASE_2_STATE_MANAGEMENT_PLAN.md).*
