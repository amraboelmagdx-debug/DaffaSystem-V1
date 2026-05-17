# Local Supabase — Phase 2.2 HR Catalog

**Scope:** Local development only. No production deployment.

---

## 1. What exists in this repo

| Item | Status |
|------|--------|
| SQL migrations | `supabase/migrations/001`–`012` (see migration table below) |
| CLI config | `supabase/config.toml` (from `npx supabase init`) |
| Dev seed | `supabase/seed.sql` — dev org, user, membership |
| App Supabase clients | `src/lib/supabase/{client,route-handler}.ts` |
| HR catalog API | `GET`/`PUT` `/api/org/hr-catalog` |
| Dev service-role fallback | `SUPABASE_SERVICE_ROLE_KEY` + `resolveHrCatalogSupabaseClient` (non-production only) |

## 2. Supabase CLI

- **Not installed globally** on all machines; use **`npx supabase`** (works via npm).
- **Docker Desktop** is required for `supabase start` (local Postgres + Auth + API).

## 3. What was missing (before setup)

1. `supabase/config.toml` — now added via `supabase init`
2. Runnable dev seed — `supabase/seed.sql` populated
3. Docker running locally
4. `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
5. Migrations applied (`supabase db reset`)

---

## 4. One-time setup

### Step A — Install prerequisites

1. [Docker Desktop](https://docs.docker.com/desktop/) (Windows: enable WSL2 if prompted)
2. Node.js (already used by this project)

### Step B — Bootstrap (automated)

```powershell
cd "C:\VS Code Projects\CRM-Dashboard"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-local-supabase.ps1
```

This runs `supabase start`, `supabase db reset` (migrations **001–012** + seed), and writes `.env.local`.

### Step C — Manual alternative

```powershell
npx supabase start
npx supabase db reset
npx supabase status -o env
```

Copy `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from status>
SUPABASE_SERVICE_ROLE_KEY=<from status>   # server-only, never NEXT_PUBLIC_

NEXT_PUBLIC_PERSIST_MODE=dual_write
NEXT_PUBLIC_HR_SERVER_HYDRATE=true
DEV_TENANT_ID=00000000-0000-4000-8000-0000000000aa
NEXT_PUBLIC_DEV_TENANT_ID=00000000-0000-4000-8000-0000000000aa
```

Restart: `npm run dev`

---

## 5. Rollback

| Goal | Action |
|------|--------|
| Disable server writes | `NEXT_PUBLIC_PERSIST_MODE=local_only` + restart dev |
| Disable Supabase entirely | Clear `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` |
| Stop local stack | `npx supabase stop` |
| Reset DB | `npx supabase db reset` |

Production is unchanged: `.env.example` defaults remain `local_only`; no remote Supabase config is committed.

---

## 6. npm scripts

```bash
npm run supabase:start   # npx supabase start
npm run supabase:stop    # npx supabase stop
npm run supabase:reset   # migrations + seed
npm run supabase:status  # URLs and keys
```

---

## 7. Migration inventory (operational graph)

Apply in order via `npx supabase db reset` (local) or `npx supabase db push` (linked remote):

| Version | File | Purpose |
|---------|------|---------|
| 001 | `001_initial_schema.sql` | Core org, companies, `organization_members`, base RLS |
| 002 | `002_planning_engine.sql` | Planning matrix, stream/scenario RLS |
| 003 | `003_revenue_stream_deal_tiers.sql` | Deal tier lines |
| 004 | `004_hr_workforce_planning.sql` | Legacy normalized HR (unused by sync) |
| 005 | `005_hr_workforce_catalog.sql` | `hr_workforce_catalog` |
| 006 | `006_hr_workforce_catalog_write_rls.sql` | HR catalog writes |
| **007** | **`007_company_hr_unit_links.sql`** | **`company_hr_unit_links`** (HR BU → planning company) |
| 008 | `008_service_architecture_catalog.sql` | Service architecture catalog |
| 009 | `009_bu_operational_metadata.sql` | BU metadata comments |
| 010 | `010_deal_economics_runs.sql` | Deal economics run snapshots |
| **011** | **`011_rls_membership_helper.sql`** | **`is_organization_member()`** — fixes RLS recursion |
| **012** | **`012_planning_projection_rls.sql`** | Member-scoped **`companies`** INSERT/UPDATE; `is_company_accessible()` for planning children |

If sync fails with `Could not find table public.company_hr_unit_links`, migrations **007+** were never applied on that database.

If sync fails with `new row violates row-level security policy for table "companies"`, migration **012** is missing or the request has no auth session (see §9).

### RLS recursion fix (011)

Migration **001** defined `org_members_self_read` on `organization_members` with a subquery on the same table, causing:

`infinite recursion detected in policy for relation "organization_members"`

**011** adds `public.is_organization_member(user_id, org_id)` (`SECURITY DEFINER`, same pattern as `has_org_role`) and replaces that policy.

### Planning projection writes (012)

Migration **001** gated `companies` INSERT/UPDATE on planner roles (`admin` … `analyst`, excluding `viewer`) while HR catalog and child planning tables allowed any org member. Economics sync (`POST /api/platform/economics/sync`) uses the **route client + JWT**; **012** aligns `companies` and planning children with `is_organization_member` / `is_company_accessible`.

| Capability | RLS |
|------------|-----|
| Read planning projection | Any org member |
| Insert/update companies, streams, scenarios (sync + app) | Any org member |
| HR catalog without login | Dev service-role only (bypasses RLS) |
| Economics sync without login | **401** — sign in at `/en/login` |

Verify after reset:

```sql
select version from supabase_migrations.schema_migrations order by version;
select to_regclass('public.company_hr_unit_links');
select policyname from pg_policies where tablename = 'organization_members';
-- expect org_members_select (not org_members_self_read)

select policyname, cmd from pg_policies where tablename = 'companies';
-- expect companies_select_member, companies_insert_member, companies_update_member
```

---

## 8. Verify RLS is enabled

In Supabase Studio → SQL, or `psql`:

```sql
select relname, relrowsecurity
from pg_class
where relname = 'hr_workforce_catalog';
-- relrowsecurity should be true
```

List policies:

```sql
select policyname, cmd
from pg_policies
where tablename = 'hr_workforce_catalog';
```

Expect: `hr_workforce_catalog_select_member`, `insert_member`, `update_member`.

---

## 9. Dev auth (RLS on API with real JWT)

| Field | Value |
|-------|--------|
| Email | `dev@local.test` |
| Password | `devpassword123` |
| Org ID | `00000000-0000-4000-8000-0000000000aa` |

Sign in at `/en/login`. PUT/GET then use the **anon key + session cookie** (RLS enforced).

Without login, dev tenant bypass + **service role** (local only) allows catalog I/O for ergonomics; that path **bypasses RLS**.

**Planning sync** (`POST /api/platform/economics/sync`) always requires a real session so `auth.uid()` satisfies RLS on `companies` and related tables.

With Supabase + `dual_write`, middleware redirects unauthenticated users to `/en/login` (or set `NEXT_PUBLIC_REQUIRE_AUTH=true`). Local setup script sets `NEXT_PUBLIC_REQUIRE_AUTH=true` by default.

If bootstrap shows a sync error instead of redirecting, use **Sign in** on the gate or open `/en/login` directly (`dev@local.test` / `devpassword123` after `db reset`).

---

## 10. Manual persistence verification

See [PHASE_2_2_IMPLEMENTATION_NOTES.md](./PHASE_2_2_IMPLEMENTATION_NOTES.md) §9 and § inspect rows below.

Operational graph (HR BU → planning workspace):

```bash
npm run verify:operational-graph
```

Checks `company_hr_unit_links`, `is_organization_member()`, `companies` RLS policies (012), and optionally authenticated `POST /api/platform/economics/sync` + `GET /api/planning/workspace` when the dev server is running.
