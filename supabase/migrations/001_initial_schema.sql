-- Enterprise Forecast Platform — PostgreSQL schema with RLS, audit, roles
-- Run in Supabase SQL editor or: supabase db push

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.app_role as enum (
    'admin', 'executive', 'finance_manager', 'sales_director', 'analyst', 'viewer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.forecast_period as enum ('monthly', 'quarterly', 'yearly', 'rolling');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opportunity_stage as enum (
    'discovery', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  );
exception when duplicate_object then null; end $$;

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'viewer',
  organization_id uuid,
  unique (user_id, organization_id)
);

create index if not exists idx_user_roles_user on public.user_roles (user_id);

-- Organizations (multi-tenant root)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Companies & hierarchy
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_company_id uuid references public.companies (id) on delete set null,
  name text not null,
  code text,
  fixed_costs_monthly numeric(18,2) not null default 0,
  growth_target_pct numeric(8,4) not null default 0,
  margin_target_pct numeric(8,4) not null default 0,
  np_target_pct numeric(8,4) not null default 0,
  market_segments jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_org on public.companies (organization_id);
create index if not exists idx_companies_parent on public.companies (parent_company_id);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_portfolios_company on public.portfolios (company_id);

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  manager_user_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_bu_company on public.business_units (company_id);

-- Revenue streams
create table if not exists public.revenue_streams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  contribution_margin_pct numeric(8,4) not null default 0.4,
  revenue_weight numeric(8,4) not null default 1,
  avg_deal_size numeric(18,2) not null default 0,
  growth_rate_pct numeric(8,4) not null default 0,
  forecast_weight numeric(8,4) not null default 1,
  operational_cost_pct numeric(8,4) not null default 0,
  sales_cycle_days int not null default 45,
  conversion_rate_pct numeric(8,4) not null default 0.2,
  delivery_cost_pct numeric(8,4) not null default 0,
  profitability_score numeric(8,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_revenue_streams_company on public.revenue_streams (company_id);

-- Deal size tiers
create table if not exists public.deal_size_tiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  level_key text not null,
  label text not null,
  min_value numeric(18,2) not null default 0,
  max_value numeric(18,2),
  avg_deal_size numeric(18,2) not null default 0,
  expected_margin_pct numeric(8,4) not null default 0.35,
  close_probability_pct numeric(8,4) not null default 0.25,
  sales_cycle_days int not null default 60,
  forecast_weight numeric(8,4) not null default 1,
  effort_score int not null default 3,
  sort_order int not null default 0,
  unique (organization_id, level_key)
);

create index if not exists idx_deal_tiers_org on public.deal_size_tiers (organization_id);

-- Scenarios
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  description text,
  is_baseline boolean not null default false,
  assumptions jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scenarios_company on public.scenarios (company_id);

-- Forecasts (period rows)
create table if not exists public.forecasts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  scenario_id uuid references public.scenarios (id) on delete set null,
  period_start date not null,
  period_end date not null,
  period_type public.forecast_period not null default 'monthly',
  revenue numeric(18,2) not null default 0,
  gross_profit numeric(18,2) not null default 0,
  operating_costs numeric(18,2) not null default 0,
  net_profit numeric(18,2) not null default 0,
  ebitda numeric(18,2) not null default 0,
  pipeline_weighted numeric(18,2) not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forecasts_company_period on public.forecasts (company_id, period_start);
create index if not exists idx_forecasts_scenario on public.forecasts (scenario_id);

-- Opportunities / pipeline
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  portfolio_id uuid references public.portfolios (id) on delete set null,
  revenue_stream_id uuid references public.revenue_streams (id) on delete set null,
  deal_tier_id uuid references public.deal_size_tiers (id) on delete set null,
  owner_user_id uuid references auth.users (id),
  client_name text not null,
  name text not null,
  stage public.opportunity_stage not null default 'discovery',
  expected_close_date date,
  probability_pct numeric(8,4) not null default 0.1,
  deal_value numeric(18,2) not null default 0,
  market_segment text,
  risk_score int not null default 1 check (risk_score between 1 and 5),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opps_company on public.opportunities (company_id);
create index if not exists idx_opps_stage on public.opportunities (stage);
create index if not exists idx_opps_close on public.opportunities (expected_close_date);

-- KPI snapshots (materialized analytics cache)
create table if not exists public.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  scenario_id uuid references public.scenarios (id) on delete cascade,
  snapshot_at timestamptz not null default now(),
  kpis jsonb not null default '{}'::jsonb
);

create index if not exists idx_kpi_company_time on public.kpi_snapshots (company_id, snapshot_at desc);

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  report_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_org on public.reports (organization_id);

-- Collaboration
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  mentions uuid[] default '{}',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_entity on public.comments (entity_type, entity_id);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  status text not null default 'pending',
  approver_id uuid references auth.users (id),
  requested_by uuid references auth.users (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- Activity & audit
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id),
  action text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_org_time on public.activities (organization_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  operation text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now()
);

create index if not exists idx_audit_table_record on public.audit_logs (table_name, record_id, changed_at desc);

-- Org membership
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'analyst',
  unique (organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members (user_id);

-- Helper: current user's role in org
create or replace function public.has_org_role(_user uuid, _org uuid, _roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.user_id = _user and m.organization_id = _org and m.role = any(_roles)
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.companies enable row level security;
alter table public.portfolios enable row level security;
alter table public.business_units enable row level security;
alter table public.revenue_streams enable row level security;
alter table public.deal_size_tiers enable row level security;
alter table public.scenarios enable row level security;
alter table public.forecasts enable row level security;
alter table public.opportunities enable row level security;
alter table public.kpi_snapshots enable row level security;
alter table public.reports enable row level security;
alter table public.comments enable row level security;
alter table public.approvals enable row level security;
alter table public.activities enable row level security;
alter table public.audit_logs enable row level security;

-- Policies: users see orgs they belong to
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "org_members_read" on public.organizations
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id and m.user_id = auth.uid()
    )
  );

create policy "organizations_update_admin" on public.organizations
  for update using (
    public.has_org_role(auth.uid(), id, array['admin']::public.app_role[])
  );

create policy "organizations_delete_admin" on public.organizations
  for delete using (
    public.has_org_role(auth.uid(), id, array['admin']::public.app_role[])
  );

create policy "organizations_insert_authenticated" on public.organizations
  for insert to authenticated with check (true);

create policy "org_members_insert_self" on public.organization_members
  for insert to authenticated with check (user_id = auth.uid());

create policy "companies_org_access" on public.companies
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = companies.organization_id and m.user_id = auth.uid()
    )
  );

create policy "companies_org_write" on public.companies
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = companies.organization_id
        and m.user_id = auth.uid()
        and m.role in ('admin', 'executive', 'finance_manager', 'sales_director', 'analyst')
    )
  );

create policy "companies_org_update" on public.companies
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = companies.organization_id
        and m.user_id = auth.uid()
        and m.role in ('admin', 'executive', 'finance_manager', 'sales_director', 'analyst')
    )
  );

-- Simpler child tables: same org via company
create policy "portfolios_via_company" on public.portfolios
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = portfolios.company_id and m.user_id = auth.uid()
    )
  );

create policy "bu_via_company" on public.business_units
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = business_units.company_id and m.user_id = auth.uid()
    )
  );

create policy "streams_via_company" on public.revenue_streams
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = revenue_streams.company_id and m.user_id = auth.uid()
    )
  );

create policy "tiers_via_org" on public.deal_size_tiers
  for all using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = deal_size_tiers.organization_id and m.user_id = auth.uid()
    )
  );

create policy "scenarios_via_company" on public.scenarios
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = scenarios.company_id and m.user_id = auth.uid()
    )
  );

create policy "forecasts_via_company" on public.forecasts
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = forecasts.company_id and m.user_id = auth.uid()
    )
  );

create policy "opps_via_company" on public.opportunities
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = opportunities.company_id and m.user_id = auth.uid()
    )
  );

create policy "kpi_via_company" on public.kpi_snapshots
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = kpi_snapshots.company_id and m.user_id = auth.uid()
    )
  );

create policy "reports_via_org" on public.reports
  for all using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = reports.organization_id and m.user_id = auth.uid()
    )
  );

create policy "comments_all_authed" on public.comments
  for all using (auth.uid() is not null);

create policy "approvals_all_authed" on public.approvals
  for all using (auth.uid() is not null);

create policy "activities_org" on public.activities
  for select using (
    organization_id is null or exists (
      select 1 from public.organization_members m
      where m.organization_id = activities.organization_id and m.user_id = auth.uid()
    )
  );

create policy "audit_read_admin" on public.audit_logs
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid() and m.role = 'admin'
    )
  );

create policy "org_members_self_read" on public.organization_members
  for select using (user_id = auth.uid() or exists (
    select 1 from public.organization_members m2
    where m2.organization_id = organization_members.organization_id
      and m2.user_id = auth.uid()
      and m2.role in ('admin', 'executive')
  ));

-- Trigger: new user profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated before update on public.companies
  for each row execute function public.set_updated_at();
create trigger revenue_streams_updated before update on public.revenue_streams
  for each row execute function public.set_updated_at();
create trigger scenarios_updated before update on public.scenarios
  for each row execute function public.set_updated_at();
create trigger forecasts_updated before update on public.forecasts
  for each row execute function public.set_updated_at();
create trigger opportunities_updated before update on public.opportunities
  for each row execute function public.set_updated_at();

-- Seed template (run after first user signs up — replace USER_ID)
-- See supabase/seed.sql for optional demo inserts

comment on table public.forecasts is 'Period-level forecast rows; metrics JSON holds CAC, LTV, ROI, etc.';
comment on table public.scenarios is 'Scenario assumptions JSON merges with company defaults for simulation.';
