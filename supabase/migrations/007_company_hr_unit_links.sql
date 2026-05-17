-- Links HR catalog business units (client-stable ids) to planning companies (server UUIDs).
-- Canonical operational graph: HR workforce catalog → company_hr_unit_links → companies + planning children.

create table if not exists public.company_hr_unit_links (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  hr_business_unit_id text not null,
  last_synced_at timestamptz not null default now(),
  primary key (organization_id, hr_business_unit_id)
);

create unique index if not exists idx_company_hr_unit_links_company
  on public.company_hr_unit_links (company_id);

create index if not exists idx_company_hr_unit_links_org
  on public.company_hr_unit_links (organization_id);

alter table public.company_hr_unit_links enable row level security;

create policy "company_hr_unit_links_select" on public.company_hr_unit_links
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = company_hr_unit_links.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy "company_hr_unit_links_write" on public.company_hr_unit_links
  for all using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = company_hr_unit_links.organization_id
        and m.user_id = auth.uid()
    )
  );

alter table public.revenue_streams
  add column if not exists metadata jsonb not null default '{}'::jsonb;
