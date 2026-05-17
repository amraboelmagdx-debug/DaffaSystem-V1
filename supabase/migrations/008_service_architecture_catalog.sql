-- Org-scoped service architecture catalog (JSONB mirror of client Zustand persist blob).

create table if not exists public.service_architecture_catalog (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  engine_version text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create index if not exists idx_service_architecture_catalog_updated
  on public.service_architecture_catalog (updated_at desc);

alter table public.service_architecture_catalog enable row level security;

create policy "service_architecture_catalog_select_member" on public.service_architecture_catalog
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = service_architecture_catalog.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy "service_architecture_catalog_insert_member" on public.service_architecture_catalog
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = service_architecture_catalog.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy "service_architecture_catalog_update_member" on public.service_architecture_catalog
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = service_architecture_catalog.organization_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = service_architecture_catalog.organization_id
        and m.user_id = auth.uid()
    )
  );
