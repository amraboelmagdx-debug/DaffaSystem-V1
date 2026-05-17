# BU schema convergence gate (Phase BU-5)

**Status:** Decision record — do not drop tables until checklist is green.

## Approved direction (option A)

- Keep `public.companies` table and UUID foreign keys.
- Treat rows as **operational unit projections** of HR business units (`company_hr_unit_links`).
- Expose API alias `operationalUnits` (implemented in `PlanningWorkspaceClientModel`).

## Deprecated (unused in application)

| Object | Action |
|--------|--------|
| `public.portfolios` | Document only until BU-5 drop migration |
| `public.business_units` | Document only — **not** HR BUs |
| `companies.parent_company_id` | Unused by HR sync; do not use for holding hierarchy |

## Pre-drop checklist

- [ ] Zero app references to `portfolios` / `business_units` (grep `src/`)
- [ ] All active HR BUs have `company_hr_unit_links` row
- [ ] Orphan companies marked or merged (`metadata.orphan` or manual cleanup)
- [ ] RLS matrix green on staging
- [ ] Stakeholder sign-off on table drop PR

## Backfill

Run `node scripts/backfill-operational-unit-links.mjs` (dry-run by default) after HR catalog is on server.
