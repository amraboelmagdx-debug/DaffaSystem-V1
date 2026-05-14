-- HR Capacity & Workforce Cost Planning — normalized schema (optional server persistence).
-- Client MVP uses Zustand + localStorage; these tables support future APIs without touching sales-planning.

do $$ begin
  create type public.hr_employment_type as enum (
    'full_time', 'part_time', 'contractor', 'freelancer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.hr_additional_cost_type as enum ('fixed', 'variable', 'percentage');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.hr_recurring_type as enum ('monthly', 'yearly', 'one_time');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.hr_import_status as enum ('pending', 'success', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.hr_departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hr_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  department_id uuid not null references public.hr_departments (id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hr_job_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  department_id uuid not null references public.hr_departments (id) on delete cascade,
  team_id uuid references public.hr_teams (id) on delete set null,
  name text not null,
  employment_type public.hr_employment_type not null default 'full_time',
  employee_count integer not null default 0 check (employee_count >= 0),
  currency char(3) not null default 'USD',
  avg_monthly_salary numeric(18, 4) not null default 0,
  avg_monthly_social_insurance numeric(18, 4) not null default 0,
  annual_medical_insurance numeric(18, 4) not null default 0,
  annual_end_of_service_cost numeric(18, 4) not null default 0,
  risk_factor_pct numeric(9, 4) not null default 0 check (risk_factor_pct >= 0),
  is_billable boolean not null default true,
  include_in_oh_allocation boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hr_job_role_additional_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_role_id uuid not null references public.hr_job_roles (id) on delete cascade,
  cost_name text not null,
  amount numeric(18, 4) not null default 0,
  cost_type public.hr_additional_cost_type not null default 'fixed',
  recurring public.hr_recurring_type not null default 'monthly',
  created_at timestamptz not null default now()
);

create table if not exists public.hr_global_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  working_days_per_week numeric(6, 2) not null default 5,
  working_hours_per_day numeric(6, 2) not null default 8,
  weeks_per_year integer not null default 52 check (weeks_per_year > 0),
  off_days_per_year integer not null default 0 check (off_days_per_year >= 0),
  default_utilization_pct numeric(6, 2) not null default 80,
  default_currency char(3) not null default 'USD',
  updated_at timestamptz not null default now()
);

create table if not exists public.hr_oh_manual_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  utilization_rate_pct numeric(6, 2) not null default 80,
  billable_employee_count integer not null default 0 check (billable_employee_count >= 0),
  total_annual_overhead numeric(18, 4) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.hr_import_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  file_name text not null,
  row_count integer not null default 0,
  status public.hr_import_status not null default 'pending',
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_workforce_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hr_departments_org on public.hr_departments (organization_id);
create index if not exists idx_hr_teams_dept on public.hr_teams (department_id);
create index if not exists idx_hr_roles_org on public.hr_job_roles (organization_id);
create index if not exists idx_hr_roles_dept on public.hr_job_roles (department_id);
create index if not exists idx_hr_import_logs_org on public.hr_import_logs (organization_id, created_at desc);
