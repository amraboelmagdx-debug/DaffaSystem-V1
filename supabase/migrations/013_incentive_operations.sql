-- Incentive plans, runs, snapshots, freezes, audit, simulator presets (tenant-scoped).

create table if not exists public.incentive_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  hr_business_unit_id text not null,
  company_id text,
  version int not null default 1,
  status text not null default 'draft',
  plan_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incentive_plans_org_bu
  on public.incentive_plans (organization_id, hr_business_unit_id, updated_at desc);

create table if not exists public.incentive_plan_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.incentive_plans (id) on delete cascade,
  version int not null,
  plan_json jsonb not null,
  parent_version_id uuid references public.incentive_plan_versions (id),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_incentive_plan_versions_plan
  on public.incentive_plan_versions (plan_id, version desc);

create table if not exists public.incentive_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  hr_business_unit_id text not null,
  plan_id uuid not null references public.incentive_plans (id) on delete cascade,
  plan_version int not null,
  mode text not null,
  period_year int not null,
  period_key text not null,
  input_hash text not null,
  dedupe_key text not null,
  run_lifecycle text not null default 'draft_run',
  supersedes_run_id uuid references public.incentive_runs (id),
  reconciliation_meta jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, dedupe_key)
);

create index if not exists idx_incentive_runs_org_bu_period
  on public.incentive_runs (organization_id, hr_business_unit_id, period_year desc, created_at desc);

create index if not exists idx_incentive_runs_plan
  on public.incentive_runs (plan_id, period_year desc);

create table if not exists public.incentive_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.incentive_runs (id) on delete cascade,
  snapshot_json jsonb not null,
  engine_version int not null,
  contract_version int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.incentive_payout_freezes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  hr_business_unit_id text not null,
  period_key text not null,
  reason text not null,
  frozen_at timestamptz not null default now(),
  unique (organization_id, hr_business_unit_id, period_key)
);

create table if not exists public.incentive_override_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.incentive_plans (id) on delete cascade,
  layer_id text not null,
  job_role_id text not null,
  old_value jsonb,
  new_value jsonb not null,
  reason text,
  changed_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_incentive_override_audit_plan
  on public.incentive_override_audit (plan_id, created_at desc);

create table if not exists public.incentive_simulator_presets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  hr_business_unit_id text not null,
  name text not null,
  preset_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incentive_simulator_presets_org_bu
  on public.incentive_simulator_presets (organization_id, hr_business_unit_id);

alter table public.incentive_plans enable row level security;
alter table public.incentive_plan_versions enable row level security;
alter table public.incentive_runs enable row level security;
alter table public.incentive_snapshots enable row level security;
alter table public.incentive_payout_freezes enable row level security;
alter table public.incentive_override_audit enable row level security;
alter table public.incentive_simulator_presets enable row level security;

create policy "incentive_plans_select" on public.incentive_plans
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_plans.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_plans_insert" on public.incentive_plans
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_plans.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_plans_update" on public.incentive_plans
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_plans.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_plan_versions_select" on public.incentive_plan_versions
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_plan_versions.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_plan_versions_insert" on public.incentive_plan_versions
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_plan_versions.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_runs_select" on public.incentive_runs
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_runs.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_runs_insert" on public.incentive_runs
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_runs.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_runs_update" on public.incentive_runs
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_runs.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_snapshots_select" on public.incentive_snapshots
  for select using (
    exists (
      select 1 from public.incentive_runs r
      join public.organization_members m on m.organization_id = r.organization_id
      where r.id = incentive_snapshots.run_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_snapshots_insert" on public.incentive_snapshots
  for insert with check (
    exists (
      select 1 from public.incentive_runs r
      join public.organization_members m on m.organization_id = r.organization_id
      where r.id = incentive_snapshots.run_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_payout_freezes_select" on public.incentive_payout_freezes
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_payout_freezes.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_payout_freezes_insert" on public.incentive_payout_freezes
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_payout_freezes.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_payout_freezes_delete" on public.incentive_payout_freezes
  for delete using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_payout_freezes.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_override_audit_select" on public.incentive_override_audit
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_override_audit.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_override_audit_insert" on public.incentive_override_audit
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_override_audit.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_simulator_presets_select" on public.incentive_simulator_presets
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_simulator_presets.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_simulator_presets_insert" on public.incentive_simulator_presets
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_simulator_presets.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_simulator_presets_update" on public.incentive_simulator_presets
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_simulator_presets.organization_id and m.user_id = auth.uid()
    )
  );

create policy "incentive_simulator_presets_delete" on public.incentive_simulator_presets
  for delete using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = incentive_simulator_presets.organization_id and m.user_id = auth.uid()
    )
  );
