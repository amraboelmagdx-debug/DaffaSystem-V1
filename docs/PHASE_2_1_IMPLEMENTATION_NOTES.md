# Phase 2.1 Implementation Notes — HR Catalog Server Hydration

**Status:** Implemented  
**Date:** 2026-05-17  
**Builds on:** [PHASE_2_0_IMPLEMENTATION_NOTES.md](./PHASE_2_0_IMPLEMENTATION_NOTES.md)

---

## 1. Scope delivered

| Capability | Module |
|------------|--------|
| Full GET hydrate flow | [`hydrate-hr-catalog.ts`](../src/lib/persistence/hydrate-hr-catalog.ts) |
| Typed fetch + errors | [`fetch-hr-catalog.ts`](../src/lib/persistence/fetch-hr-catalog.ts) |
| `localSavedAt` sidecar | [`hr-catalog-local-meta.ts`](../src/lib/persistence/hr-catalog-local-meta.ts) |
| Meta touch on HR persist write | [`hr-catalog-storage.ts`](../src/lib/persistence/hr-catalog-storage.ts) |
| Safe merge (same as Zustand) | [`mergePersistedHrCatalog`](../src/stores/use-hr-workforce-store.ts) |
| Uplift prep (no PUT) | [`hr-catalog-uplift.ts`](../src/lib/persistence/hr-catalog-uplift.ts) |
| Hydration state in UI | [`TenantPersistenceProvider`](../src/components/providers/tenant-persistence-provider.tsx) → `hrHydration` |
| Read/write decoupling | [`persist-mode.ts`](../src/lib/persistence/persist-mode.ts) — HR read on by default; `shouldSyncToServer()` still false until 2.2 |

**Not delivered:** PUT `/api/org/hr-catalog`, dual-write, service catalog hydrate, `server_authoritative`.

---

## 2. Hydrate lifecycle

1. `setActiveOrganizationId(orgId)`
2. `clearInMemoryEconomicsBleed()`
3. `persist.rehydrate()` HR + SA (namespaced local)
4. Legacy global → namespaced copy (2.0)
5. `persist.rehydrate()` again
6. **`hydrateHrCatalogFromServer(orgId)`**
   - Read `localSavedAt` from `efp-{orgId}-hr-workforce-meta`
   - `GET /api/org/hr-catalog` (unless `NEXT_PUBLIC_HR_SERVER_HYDRATE=false`)
   - Apply precedence (below)
7. Provider sets `hrHydration` result; `isHydratingEconomics=false`

---

## 3. Merge precedence rules

| Condition | Result |
|-----------|--------|
| `NEXT_PUBLIC_HR_SERVER_HYDRATE=false` | `status: skipped`, keep local |
| GET error (5xx, network) | `status: error`, keep local, non-fatal |
| GET 404 | `source: local`; if catalog has BUs/roles → `pendingUplift` |
| GET 200, `server.updatedAt >= localSavedAt` | `mergeHrPersistedCatalogIntoState`, `source: server`, clear uplift |
| GET 200, `localSavedAt > server.updatedAt` | keep local, `pendingUplift` |
| Invalid/missing local timestamp | Treated as epoch 0 → server wins on 200 |

Server merge uses **`mergePersistedHrCatalog`** — same path as Zustand `persist.merge` (snapshots, role migration, OH maps preserved).

---

## 4. Stale local handling

- Server newer: in-memory state updated; namespaced `localStorage` updates on next user edit via Zustand persist.
- Local newer: local kept; `sessionStorage` flag `efp-hr-pending-uplift-{orgId}` for Phase 2.2 PUT.
- 404 with local data: local SOA + uplift flag (one-time server seed pending).
- Import session fields: never overwritten (not in server `catalog` / merge keys).

---

## 5. Rollback

| Lever | Effect |
|-------|--------|
| `NEXT_PUBLIC_HR_SERVER_HYDRATE=false` | Skip GET entirely |
| `NEXT_PUBLIC_PERSIST_MODE=local_only` | Writes still local-only; **reads still run** unless hydrate flag false |
| Failed GET | App uses namespaced local; `hrHydration.status === 'error'` |
| Code revert | Remove hydrate module; restore 2.0 skeleton |

---

## 6. Environment variables

```env
NEXT_PUBLIC_HR_SERVER_HYDRATE=true   # default: fetch on load
NEXT_PUBLIC_PERSIST_MODE=local_only  # no PUT until 2.2
```

Align `DEV_TENANT_ID` and `NEXT_PUBLIC_DEV_TENANT_ID` for dev testing.

---

## 7. Development-only hydration debug

When `NODE_ENV=development`, the client exposes:

```javascript
window.__EFP_HR_HYDRATION_DEBUG
```

| Field | Meaning |
|-------|---------|
| `source` | `server` \| `local` \| `fallback` \| `empty` |
| `lastServerHydrationAt` | ISO from server row when server wins |
| `lastLocalHydrationAt` | ISO from `efp-{orgId}-hr-workforce-meta` sidecar |
| `pendingUplift` | Session flag for 2.2 PUT |
| `hydrationErrors` | Recent non-fatal errors (fetch failures, etc.) |
| `lastDecision` | Branch label (e.g. `server_updated_at_gte_local`) |

Console: filter DevTools console by `[EFP HR Hydrate]`.

**Not present in production builds** — all debug helpers no-op when `NODE_ENV !== 'development'`.

### Namespaced persist troubleshooting

If `localStorage` only updates `efp-hr-workforce`, inspect:

```javascript
window.__EFP_HR_HYDRATION_DEBUG.persist
// usingLegacyFallback: true → active org was null or namespacing disabled
// lastResolvedHrPersistKey → actual key used for last HR persist I/O
```

**Common causes:**

1. `getActiveOrganizationId()` was `null` when Zustand first rehydrated/wrote (before `TenantPersistenceProvider` finished `/api/tenant/context`).
2. `DEV_TENANT_ID` set server-side but `NEXT_PUBLIC_DEV_TENANT_ID` missing — server APIs work but client resolver had no org until fetch (align both in `.env.local`).
3. `NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST=false` forces legacy keys.

After bootstrap fix: provider sets org from `NEXT_PUBLIC_DEV_TENANT_ID` + `sessionStorage` hint `efp-active-org-client-hint` before rendering dashboard children.

---

## 8. `hrHydration` shape (hook / context)

```typescript
{
  status: "idle" | "loading" | "success" | "error" | "skipped";
  source: "local" | "server" | "none";
  errorMessage?: string;
  serverUpdatedAt?: string;
  localSavedAt?: string;
  pendingUplift: boolean;
}
```

Access via `useActiveOrganization().hrHydration`.

---

## 9. Manual QA checklist

- [ ] Supabase row with `updated_at` newer than local sidecar → HR UI shows server data after reload
- [ ] Local sidecar newer than server → local data kept; `pendingUplift` true in React devtools / hook
- [ ] No server row (404) → local namespaced data unchanged
- [ ] `NEXT_PUBLIC_HR_SERVER_HYDRATE=false` → no `/api/org/hr-catalog` in network tab
- [ ] Org switch → different `efp-{orgId}-*` keys and independent catalogs
- [ ] Executive `/` demo — `efp-workspace` unchanged
- [ ] No `PUT /api/org/hr-catalog` in network tab

---

## 10. Tests

```bash
npm run typecheck
npm run test
```

New/updated: `hydrate-hr-catalog.test.ts`, `hr-catalog-local-meta.test.ts`, `hr-catalog-uplift.test.ts`, `persist-mode.test.ts`.

---

## 11. Known limitations

- HR dev disk mirror remains global (`data/hr-workforce-persist.json`).
- No automatic PUT when `pendingUplift` (2.2).
- Service Architecture still local-only until 2.3.
- Server hydrate does not use `ETag` / `If-Match` yet.

---

## 12. Gate for Phase 2.2

- [ ] `PUT /api/org/hr-catalog` + RLS write policies
- [ ] Execute uplift when `pendingUplift` and `shouldSyncToServer()`
- [ ] Debounced dual-write from store mutations

---

*Design: [PHASE_2_MIGRATION_STRATEGY.md](./PHASE_2_MIGRATION_STRATEGY.md) § 2.1 · [PHASE_2_STATE_MANAGEMENT_PLAN.md](./PHASE_2_STATE_MANAGEMENT_PLAN.md) § 6*
