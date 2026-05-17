# Phase 2.0 Implementation Notes — Namespaced Client Persistence

**Status:** Implemented  
**Date:** 2026-05-17  
**Scope:** Stage 2.0 only — no server PUT, dual-write, or service catalog API

---

## 1. What was delivered

| Capability | Implementation |
|------------|----------------|
| Tenant-scoped `localStorage` keys | `efp-{organizationId}-hr-workforce`, `efp-{organizationId}-service-architecture-v1` |
| Active org singleton | [`src/lib/persistence/active-tenant.ts`](../src/lib/persistence/active-tenant.ts) |
| Storage adapter (Option B) | [`src/lib/persistence/tenant-storage.ts`](../src/lib/persistence/tenant-storage.ts) wraps Zustand persist I/O |
| Legacy global → namespaced copy | [`src/lib/persistence/legacy-persist-migrate.ts`](../src/lib/persistence/legacy-persist-migrate.ts) (one-time per org, globals retained) |
| Org switch + hydrate orchestration | [`hydrate-economics-stores.ts`](../src/lib/persistence/hydrate-economics-stores.ts), [`switch-active-organization.ts`](../src/lib/persistence/switch-active-organization.ts) |
| Dashboard bootstrap | [`TenantPersistenceProvider`](../src/components/providers/tenant-persistence-provider.tsx) in [`(dashboard)/layout.tsx`](../src/app/[locale]/(dashboard)/layout.tsx) |
| Persist mode foundation | [`persist-mode.ts`](../src/lib/persistence/persist-mode.ts) — default `local_only` |
| Hook for future UI | [`use-active-organization.ts`](../src/hooks/use-active-organization.ts) |

**Not delivered (later stages):** `PUT /api/org/hr-catalog`, debounced dual-write, `006` service catalog table, prefs namespacing (2.5), `server_authoritative` cutover (2.6).

---

## 2. Files changed

### New

- `src/lib/persistence/*` — core modules + unit tests
- `src/components/providers/tenant-persistence-provider.tsx`
- `src/components/providers/tenant-persistence-context.tsx`
- `src/hooks/use-active-organization.ts`

### Modified (minimal)

- `src/stores/use-hr-workforce-store.ts` — tenant-wrapped hybrid storage
- `src/stores/use-service-architecture-store.ts` — tenant-wrapped localStorage
- `src/app/[locale]/(dashboard)/layout.tsx` — provider wrapper
- `.env.example` — persistence env vars

### Unchanged

- `use-workspace-store` (`efp-workspace`)
- Prefs / sales-plan stores
- All `src/lib/**` engines
- Supabase migrations and org API PUT routes

---

## 3. Environment variables

| Variable | Default (2.0) | Purpose |
|----------|---------------|---------|
| `NEXT_PUBLIC_PERSIST_MODE` | `local_only` | `local_only` \| `dual_write` \| `server_authoritative` |
| `NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST` | `true` | Set `false` to revert to legacy global keys only |
| `NEXT_PUBLIC_DEV_TENANT_ID` | — | Client fallback when `/api/tenant/context` is 401 in development |
| `NEXT_PUBLIC_DEV_TENANT_NAME` | — | Display name for dev fallback |
| `DEV_TENANT_ID` | — | Server dev bypass (should match public id for consistent namespacing) |

With `local_only`, `shouldHydrateFromServer()` is **false** — no `GET /api/org/hr-catalog` on load. Set `dual_write` to exercise the hydrate skeleton without enabling PUT (2.2).

---

## 4. Persist migration strategy

1. On dashboard load, `GET /api/tenant/context` (or dev fallback) sets active org id.
2. In-memory economics state is cleared (bleed guard), then Zustand `persist.rehydrate()` reads the **namespaced** key.
3. If namespaced key is empty and legacy global exists, JSON is **copied once** to namespaced; `sessionStorage` flag `efp-legacy-migrated-{orgId}` prevents repeat.
4. Global keys `efp-hr-workforce` / `efp-service-architecture-v1` are **never deleted**.

Before active org is set (SSR / very early client), storage falls back to legacy global keys only.

---

## 5. Rollback safety

| Level | Action |
|-------|--------|
| L1 | `NEXT_PUBLIC_PERSIST_MODE=local_only` (default) |
| L2 | `NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST=false` |
| L3 | Revert store `storage` lines to pre-2.0 |
| L4 | User clears `efp-{orgId}-*` in DevTools; globals still hold legacy data |

---

## 6. Org-switch safety

`switchActiveOrganization(organizationId)`:

1. `POST /api/tenant/switch` (cookie `efp-active-org`)
2. `setActiveOrganizationId`
3. `clearInMemoryEconomicsBleed()` — does **not** call `resetModule` / `resetServiceArchitecture`
4. `persist.rehydrate()` for HR + SA
5. Legacy migrate + second rehydrate
6. Optional HR server read if `shouldHydrateFromServer()`

`TenantPersistenceProvider` exposes `isHydratingEconomics` until step 6 completes on initial load.

---

## 7. Known limitations

| Item | Notes |
|------|--------|
| HR dev disk mirror | Still global `data/hr-workforce-persist.json` — tenant-scoped disk deferred to 2.6 |
| Single `DEV_TENANT_ID` | Multi-org manual QA needs two org memberships in Supabase or two browser profiles |
| Early module load | Zustand may rehydrate from legacy key before provider runs; provider rehydrate corrects |
| Server hydrate | Skeleton only; no `updated_at` conflict resolution until 2.1 |
| Prefs stores | Still global keys (2.5) |

---

## 8. Manual QA checklist

- [ ] Set `DEV_TENANT_ID` + `NEXT_PUBLIC_DEV_TENANT_ID` to the same UUID in `.env.local`
- [ ] Open HR module, change a BU name, confirm `localStorage` key `efp-{orgId}-hr-workforce` updates
- [ ] With legacy `efp-hr-workforce` populated and namespaced empty, reload dashboard — data appears under namespaced key
- [ ] Executive dashboard (`/`) — companies/scenarios unchanged; `efp-workspace` untouched
- [ ] Network tab: no `PUT /api/org/hr-catalog`
- [ ] (Multi-org) Switch org via `switchOrganization` from console/hook — catalogs differ, no bleed

---

## 9. Tests

```bash
npm run typecheck
npm run test
```

New tests under `src/lib/persistence/*.test.ts` (active-tenant, persist-keys, persist-mode, tenant-storage, legacy-persist-migrate).

---

## 10. Gate for Phase 2.1

- [ ] Enable `NEXT_PUBLIC_PERSIST_MODE=dual_write` in staging only after PUT route exists
- [ ] Implement timestamp-based load precedence in `hydrate-economics-stores.ts`
- [ ] Live RLS tests remain separate ([PHASE_2_RLS_TEST_PLAN.md](./PHASE_2_RLS_TEST_PLAN.md))

---

*Design reference: [PHASE_2_MIGRATION_STRATEGY.md](./PHASE_2_MIGRATION_STRATEGY.md) § Stage 2.0 · [PHASE_2_STATE_MANAGEMENT_PLAN.md](./PHASE_2_STATE_MANAGEMENT_PLAN.md)*
