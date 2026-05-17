-- Phase 1: org-scoped HR workforce catalog (JSONB mirror of client Zustand persist blob).
-- Read-only API in app; writes deferred to Phase 2.

create table if not exists public.hr_workforce_catalog (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  engine_version text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create index if not exists idx_hr_workforce_catalog_updated
  on public.hr_workforce_catalog (updated_at desc);

alter table public.hr_workforce_catalog enable row level security;

create policy "hr_workforce_catalog_select_member" on public.hr_workforce_catalog
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = hr_workforce_catalog.organization_id
        and m.user_id = auth.uid()
    )
  );

-- Phase 1: read-only from app; no insert/update policies for authenticated users yet.
