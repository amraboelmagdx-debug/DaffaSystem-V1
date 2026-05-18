# Pilot Readiness Report

**Updated:** Persistence Recovery (2026-05-17)

## 1. Root causes found (Pilot QA)

| Issue | Root cause | Fix applied |
|-------|------------|-------------|
| HR catalog **unavailable** | Truth probe used `select("id")` on `hr_workforce_catalog` (PK is `organization_id` only) | Probe uses `organization_id`; backend `supabase` when dual_write + probe pass |
| SA catalog **unavailable** | Service catalog reused HR probe; never queried `service_architecture_catalog` | Dedicated `serviceCatalogProbeOk` probe |
| Incentive **500** | Default plan id `plan-{buId}` is not a UUID; Postgres rejects inserts | `createDefaultIncentivePlan` uses `crypto.randomUUID()`; server remaps legacy ids on save |
| Run save **500** | FK `plan_id` UUID + plan not in DB | `PLAN_NOT_PERSISTED` 409; UUID validation on run/plan |
| Banner **0/10** vs panel **3/10** | Banner called `resolvePersistenceTruth()` without server probes | Banner + panel share `usePersistenceTruth` → `/api/dev/persistence-truth` |
| Mixed labels | Intentional Zustand cache; labeled `mixed` even when server OK | `supabase` when probes + auth + dual_write/hydrate pass; `mixed` only when cache layer active |

### Environment checks (operator)

- Run `npm run verify:pilot-migrations` against pilot Supabase
- Apply `013_incentive_operations.sql` if incentive tables fail
- Set `NEXT_PUBLIC_PERSIST_MODE=dual_write` when Supabase is configured
- Ensure `organization_members` row for signed-in user
- Do **not** set `INCENTIVE_ALLOW_MEMORY_FALLBACK` in staging

## 2. Fixes applied (files)

| Area | Files |
|------|--------|
| Probes | `src/server/persistence/persistence-truth-probes.ts` |
| Truth registry | `src/lib/persistence/persistence-truth-registry.ts` |
| UUID / incentives | `src/lib/incentives/uuid.ts`, `default-plan.ts`, `persist-incentive-plan.ts`, `persist-incentive-run.ts`, `use-incentive-plan-store.ts` |
| Verify suite | `src/server/persistence/persistence-verify-roundtrips.ts`, `api/dev/persistence-verify`, `api/dev/persistence-truth` |
| QA UI | `src/hooks/use-persistence-truth.ts`, `persistence-status-banner.tsx`, `qa-debug-panel.tsx` |
| Durability | `src/lib/persistence/restart-durability-checklist.ts` |
| Script | `scripts/verify-pilot-migrations.mjs`, `npm run verify:pilot-migrations` |

## 3. Final persistence matrix (expected after fixes + env)

| Domain | Backend (when dual_write + Supabase + auth) | Restart-safe |
|--------|---------------------------------------------|--------------|
| HR catalog | supabase | yes |
| Service catalog | supabase | yes |
| Planning workspace | supabase | yes |
| Scenario bundles | supabase | yes |
| Sales Plan wizard | localStorage | no (by design) |
| Sales Plan → workspace | supabase | yes |
| Incentive plans/runs | supabase | yes (requires 013) |
| Incentive presets | supabase | yes |
| Compare runs UI | ephemeral | no (by design) |
| Incentive audit | supabase | yes |

## 4. Server-authoritative percentage

- **Target:** 7/10 domains (wizard + compare excluded by design)
- **Measured via:** QA panel → Truth tab → `pilotVerdict` (must match banner)

## 5. Remaining local-only / ephemeral

- Sales Plan wizard (`efp-sales-plan-wizard` localStorage)
- Run compare UI selection (React state)

## 6. Restart durability

Use QA panel **Truth** tab checklist or `GET /api/dev/persistence-truth` → `durabilityChecklist` + `roundtrips`.

Critical pass criteria:

- `auth`, `migration_013`, `hr_catalog`, `service_catalog`, `planning_workspace`, `scenario_bundles`, `incentive_plans_runs`

## 7. Pilot QA readiness verdict

**Is critical business data stored on the server safely?**

**Yes**, when all of the following hold:

- Supabase configured and migrations **001–013** applied (`npm run verify:pilot-migrations`)
- `NEXT_PUBLIC_PERSIST_MODE=dual_write`
- Valid auth session + org membership (or dev tenant with org row in DB)
- Incentives not memory-backed
- Plan saved to server before run persist (UUID plan id)

**Pilot-ready for structured manual QA** when QA Truth shows ≥7/10 server-authoritative and durability checklist critical items pass.

**Not pilot-ready** if incentive 500 persists after migration 013 + dual_write — check QA Errors tab for `probeErrors` and Postgres message on plan/run save.
