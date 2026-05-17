-- BU-centric correction (additive): tag planning companies as HR BU projections.
-- No table renames; safe to apply before Deal Economics expansion.

comment on table public.companies is
  'Planning projection of an HR Business Unit per organization (see company_hr_unit_links).';

comment on table public.business_units is
  'DEPRECATED scaffold (001): not HR business units. Do not use for workforce sync.';

comment on table public.portfolios is
  'DEPRECATED scaffold (001): unused by application.';

create index if not exists idx_companies_org_hr_bu_metadata
  on public.companies (organization_id)
  where (metadata ->> 'hrBusinessUnitId') is not null;
