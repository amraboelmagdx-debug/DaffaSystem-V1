-- Versioned deal / calculator economics runs (additive gate — no UI yet).

create table if not exists public.deal_economics_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  hr_business_unit_id text not null,
  input_json jsonb not null,
  result_json jsonb not null,
  engine_version int not null,
  contract_version int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_economics_runs_org_bu
  on public.deal_economics_runs (organization_id, hr_business_unit_id, created_at desc);

comment on table public.deal_economics_runs is
  'Immutable evaluateDealEconomics snapshots for Calculator / proposal audit (input + result JSON).';

alter table public.deal_economics_runs enable row level security;

create policy "deal_economics_runs_select" on public.deal_economics_runs
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = deal_economics_runs.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy "deal_economics_runs_insert" on public.deal_economics_runs
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = deal_economics_runs.organization_id
        and m.user_id = auth.uid()
    )
  );
