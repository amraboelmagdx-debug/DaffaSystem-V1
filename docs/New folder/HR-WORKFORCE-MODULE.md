# HR Capacity & Workforce Cost Planning

This module is **standalone** from Sales Plan OS and executive forecasting. It provides:

- **Workforce cost engine** — monthly/annual fully loaded costs, standard hourly rate, OH-adjusted hourly rate (`src/lib/hr-workforce/workforce-cost-engine.ts`).
- **OH rate engine** — manual utilization, billable headcount, and annual overhead → OH $/hr (`src/lib/hr-workforce/oh-engine.ts`).
- **Monthly working hours** — `workingDaysPerWeek × workingHoursPerDay × 52 / 12` per employee (`src/lib/hr-workforce/monthly-hours.ts`).
- **Client persistence** — Zustand store `efp-hr-workforce` (`src/stores/use-hr-workforce-store.ts`).
- **Optional Supabase schema** — `supabase/migrations/004_hr_workforce_planning.sql` for future org-scoped APIs (not wired to the UI yet).

## Boundaries

- **No** product/service catalog or service cost calculator.
- **No** utilization baked into direct labor hourly rate; utilization is used for OH methodology and analytics, per product direction.
- **Google Sheets**: import via **downloaded** `.xlsx` or `.csv` (no live Sheets API in this build).

## Routes (under `[locale]`)

| Path | Purpose |
|------|---------|
| `/hr-workforce` | Executive + OH + department/role analytics |
| `/hr-workforce/roles` | Role grid, inline edits, bulk billable, duplicate/archive |
| `/hr-workforce/settings` | HR globals, OH manual inputs, departments/teams, snapshots, reset |
| `/hr-workforce/import` | Upload, column map, preview, validate, commit, template download |

## Additional cost cell format (import)

`Name:Amount:fixed|variable|percentage:monthly|yearly|one_time` — multiple rows separated by `|`.

## Tests

`npm run test` includes `src/lib/hr-workforce/*.test.ts` for OH, monthly hours, and role costing.
