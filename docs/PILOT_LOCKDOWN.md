# Pilot Lockdown — Frozen Operational Semantics

This document freezes persistence and QA behavior for the operational pilot. **No new persistence backends or CRM features** are in scope during lockdown.

## Locked behaviors

### Hydration order (client bootstrap)

1. Active organization resolution (`bootstrapActiveOrganizationFromPublicDevEnv` / client hint)
2. HR catalog hydrate (`prepareEconomicsStoresForOrganization` → `finishHrCatalogPersistenceSetup`)
3. Service catalog hydrate (`finishServiceCatalogPersistenceSetup`)
4. Operational workspace bootstrap (`bootstrapOperationalWorkspaceFromHr`)
5. Optional workspace server hydrate when `NEXT_PUBLIC_WORKSPACE_SERVER_HYDRATE` is enabled and session exists

### Incentive backend rules

| Condition | Backend |
|-----------|---------|
| Supabase configured, client available, migration 013 | `supabase` |
| Supabase configured, no client, no memory flag | `unavailable` (503) |
| `INCENTIVE_ALLOW_MEMORY_FALLBACK=true` | `memory` (local dev only) |

- No silent fallback from failed Supabase writes to in-memory Maps.
- API responses include `meta.persistenceBackend` and `meta.fallbackActive`.

### Freeze / rerun

- Frozen plans reject persist with 409.
- Rerun with `supersede` marks prior run superseded; History shows lineage.

### Reconciliation tolerances

Defined in `src/lib/planning/reconciliation/compare-canonical-outputs.ts`:

- Relative: 0.5% default; NP/CM 2%; attainment 3%
- Absolute: SAR 1 default; revenue annualized SAR 10,000; pool SAR 5,000

### Scenario API contract

- `persistScenarioBundleToServer` returns `{ ok, status?, message? }`.
- Failures recorded in `window.__EFP_PLATFORM_DEBUG.lastScenarioPersistError`.
- QA panel **Errors** tab surfaces scenario and incentive persist failures.

## Non-deterministic / local-only behaviors

| Behavior | Notes |
|----------|-------|
| Forward forecast heuristic | Annualization may differ from Sales Plan annual model |
| Dual CM paths | Executive may use streams vs workbook CM |
| Sales Plan wizard | `localStorage` only until Apply to workspace |
| Compare runs UI | Ephemeral — not stored on server |
| Scenario bundles | Mixed: Zustand + `scenarios.assumptions`; server wins on hydrate |

## Environment (pilot / staging)

```env
NEXT_PUBLIC_PERSIST_MODE=dual_write
NEXT_PUBLIC_SHOW_QA_PANEL=true
NEXT_PUBLIC_WORKSPACE_SERVER_HYDRATE=true   # default when Supabase set
# Do NOT set in staging:
# INCENTIVE_ALLOW_MEMORY_FALLBACK=true
```

Apply Supabase migration `013_incentive_operations.sql` before incentive QA.

## Dev tooling

| Tool | Access |
|------|--------|
| QA panel | `NODE_ENV=development` OR `NEXT_PUBLIC_SHOW_QA_PANEL=true` |
| Persistence truth API | `GET /api/dev/persistence-truth` (probes + roundtrips + checklist) |
| Persistence verify API | `GET /api/dev/persistence-verify` |
| Migration verify CLI | `npm run verify:pilot-migrations` |
| Persistence status API | `GET /api/dev/persistence-status` |
| Platform debug | `window.__EFP_PLATFORM_DEBUG` |

## Canonical vs cache (recovery 2026-05-17)

- **Server canonical:** `hr_workforce_catalog`, `service_architecture_catalog`, planning tables, `scenarios`, incentive 013 tables.
- **Local cache only:** Zustand persist mirrors until hydrate; server row wins on bootstrap hydrate.
- **Ephemeral:** Sales Plan wizard until Apply; incentive compare-run UI selection.
- **Incentive plan/run IDs must be UUIDs** (legacy `plan-{buId}` ids are remapped on save).

## Stale scenario overwrite

On workspace hydrate, server scenario bundle version should win over stale local cache. Dev builds may log when server `version` exceeds local (see workspace hydrate path).
