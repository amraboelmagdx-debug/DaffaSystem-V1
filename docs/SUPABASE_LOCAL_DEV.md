# Local Supabase — Phase 2.2 HR Catalog

**Scope:** Local development only. No production deployment.

---

## 1. What exists in this repo

| Item | Status |
|------|--------|
| SQL migrations | `supabase/migrations/001`–`006` (includes `005` HR catalog + `006` write RLS) |
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

This runs `supabase start`, `supabase db reset` (migrations **001–006** + seed), and writes `.env.local`.

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

## 7. Verify RLS is enabled

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

## 8. Dev auth (RLS on API with real JWT)

| Field | Value |
|-------|--------|
| Email | `dev@local.test` |
| Password | `devpassword123` |
| Org ID | `00000000-0000-4000-8000-0000000000aa` |

Sign in at `/en/login`. PUT/GET then use the **anon key + session cookie** (RLS enforced).

Without login, dev tenant bypass + **service role** (local only) allows catalog I/O for ergonomics; that path **bypasses RLS**.

---

## 9. Manual persistence verification

See [PHASE_2_2_IMPLEMENTATION_NOTES.md](./PHASE_2_2_IMPLEMENTATION_NOTES.md) §9 and § inspect rows below.
