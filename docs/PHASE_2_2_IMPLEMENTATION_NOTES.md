# Phase 2.2 Implementation Notes — HR Catalog Dual-Write

**Status:** Implemented  
**Date:** 2026-05-17  
**Builds on:** [PHASE_2_1_IMPLEMENTATION_NOTES.md](./PHASE_2_1_IMPLEMENTATION_NOTES.md)

---

## 1. Scope delivered

| Capability | Module |
|------------|--------|
| `PUT /api/org/hr-catalog` | [`route.ts`](../src/app/api/org/hr-catalog/route.ts) |
| Zod + structural validation | [`hr-catalog-schema.ts`](../src/server/validation/hr-catalog-schema.ts), [`validate-hr-catalog-structure.ts`](../src/server/validation/validate-hr-catalog-structure.ts) |
| Server upsert + conflict | [`save-hr-catalog.ts`](../src/server/hr/save-hr-catalog.ts), `TenantConflictError` (409) |
| RLS INSERT/UPDATE | [`006_hr_workforce_catalog_write_rls.sql`](../supabase/migrations/006_hr_workforce_catalog_write_rls.sql) |
| Debounced dual-write | [`hr-catalog-dual-write.ts`](../src/lib/persistence/hr-catalog-dual-write.ts) |
| Pending uplift execution | [`execute-hr-catalog-uplift.ts`](../src/lib/persistence/execute-hr-catalog-uplift.ts) |
| Post-hydrate wiring | [`finish-hr-catalog-persistence-setup.ts`](../src/lib/persistence/finish-hr-catalog-persistence-setup.ts) |
| Sync status (foundation) | [`hr-catalog-sync-state.ts`](../src/lib/persistence/hr-catalog-sync-state.ts) → `hrSync` on tenant context |
| PUT client | [`put-hr-catalog.ts`](../src/lib/persistence/put-hr-catalog.ts) |
| Payload helper | [`hr-catalog-payload.ts`](../src/lib/persistence/hr-catalog-payload.ts) |

**Not delivered:** Service catalog PUT/GET (2.3/2.4), `server_authoritative` mode, live RLS CI job, import dry-run APIs.

---

## 2. Write lifecycle

1. User mutates HR store → Zustand `persist` writes namespaced `localStorage` + `localSavedAt` sidecar (unchanged).
2. Store subscriber (dual-write) detects partialized catalog change → debounce **500ms**.
3. `PUT /api/org/hr-catalog` with `catalog`, `engineVersion`, optional `expectedUpdatedAt`.
4. Server validates (Zod + structure), upserts `hr_workforce_catalog` for session org only.
5. On **200**: `hrSync.syncStatus = synced`, `lastKnownServerUpdatedAt` updated, `pendingUplift` cleared.
6. On failure: local unchanged; `hrSync.syncStatus = error` (no rollback).

Hydration sets `syncPaused` so server merge does not trigger PUT echo.

---

## 3. Dual-write sequencing

| Event | Behavior |
|-------|----------|
| App load / org hydrate | Local rehydrate → GET (2.1) → `finishHrCatalogPersistenceSetup` |
| After hydrate + `dual_write` | Immediate uplift if `pendingUplift` → enable subscriber |
| User edit | Local persist → debounced PUT |
| Org switch | `flushHrCatalogSync(previousOrgId)` before `POST /api/tenant/switch` |
| Tab close | `pagehide` / `beforeunload` flush with `keepalive` |

---

## 4. Conflict handling

- **Load:** Server `updated_at >= localSavedAt` → server wins (2.1).
- **Write:** Client sends `expectedUpdatedAt` when known; server returns **409** on mismatch.
- **409 client:** `syncStatus: error`; in-memory catalog **not** reverted.
- **Uplift / first seed:** `skipExpectedUpdatedAt` (no guard on empty or stale server row).

---

## 5. Rollback safety

| Lever | Effect |
|-------|--------|
| `NEXT_PUBLIC_PERSIST_MODE=local_only` | No PUT; GET hydrate still optional |
| Failed PUT | Local remains authoritative for UX |
| Code revert | Namespaced keys retain data |

---

## 6. Offline / retry

- Offline: local persist works; PUT fails → `error` + retry on `online` / tab visible when status was `error`.
- Retries: 1s, 2s, 4s for network / 5xx / 429 only (max 3).
- Jobs tagged with `organizationId`; aborted if active org changed before send.

---

## 7. Environment

```env
NEXT_PUBLIC_PERSIST_MODE=dual_write
NEXT_PUBLIC_HR_SERVER_HYDRATE=true
NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST=true
DEV_TENANT_ID=...          # align with NEXT_PUBLIC_DEV_TENANT_ID
NEXT_PUBLIC_DEV_TENANT_ID=...
```

Apply migration:

```bash
supabase db reset   # or apply 006_hr_workforce_catalog_write_rls.sql
```

---

## 8. `hrSync` shape (hook)

```typescript
{
  syncStatus: "idle" | "pending" | "synced" | "error";
  lastLocalSaveAt: string | null;
  lastServerSyncAt: string | null;
  lastKnownServerUpdatedAt: string | null;
  lastError: string | null;
}
```

Access via `useActiveOrganization().hrSync`.

---

## 9. Manual QA checklist

- [ ] `dual_write`: edit HR → debounced PUT 200; `hrSync.syncStatus === 'synced'`
- [ ] 404 + local data → uplift PUT on load; `pendingUplift` false
- [ ] `local_only` → no PUT in network tab
- [ ] Org switch → flush previous org before switch
- [ ] 409 (change server row between edits) → local intact, `syncStatus: error`
- [ ] Offline edit → local saved; online → retry succeeds

---

## 10. Tests

```bash
npm run typecheck
npm run test
```

New: `hr-catalog-schema.test.ts`, `validate-hr-catalog-structure.test.ts`, `save-hr-catalog.test.ts`, `put-hr-catalog.test.ts`, `hr-catalog-dual-write.test.ts`, `execute-hr-catalog-uplift.test.ts`.

Live RLS: see [PHASE_2_RLS_TEST_PLAN.md](./PHASE_2_RLS_TEST_PLAN.md) (manual / optional CI).

---

## 11. Known limitations

- Dev disk mirror (`data/hr-workforce-persist.json`) remains global.
- Service Architecture still local-only until 2.3.
- Full-catalog JSONB PUT (no delta sync).
- `server_authoritative` not enforced yet (2.6).

---

*Design: [PHASE_2_MIGRATION_STRATEGY.md](./PHASE_2_MIGRATION_STRATEGY.md) § 2.2 · [PHASE_2_API_PLAN.md](./PHASE_2_API_PLAN.md) § 5*
