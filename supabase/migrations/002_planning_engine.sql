-- Phase 2: planning matrix, market segments, scenario history, company baseline revenue

alter table public.companies
  add column if not exists baseline_revenue_monthly numeric(18,2) not null default 0;

-- Normalized market segments (optional replacement for jsonb on companies)
create table if not exists public.market_segments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  code text,
  sort_order int not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_market_segments_company on public.market_segments (company_id);

-- Case-insensitive segment names per company (expression not allowed in table UNIQUE).
create unique index if not exists idx_market_segments_company_name_ci
  on public.market_segments (company_id, lower(name));

-- Scenario lineage & snapshots
alter table public.scenarios
  add column if not exists parent_scenario_id uuid references public.scenarios (id) on delete set null;

alter table public.scenarios
  add column if not exists version int not null default 1;

create table if not exists public.scenario_snapshots (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  label text,
  snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_scenario_snapshots_scenario on public.scenario_snapshots (scenario_id, created_at desc);

-- Excel-like workbook: rows (metrics / drivers / groups)
create table if not exists public.planning_matrix_rows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  scenario_id uuid references public.scenarios (id) on delete cascade,
  row_key text not null,
  label text not null,
  row_kind text not null default 'driver',
  sort_order int not null default 0,
  parent_row_id uuid references public.planning_matrix_rows (id) on delete set null,
  formula text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_planning_rows_key_scenario
  on public.planning_matrix_rows (company_id, scenario_id, row_key)
  where scenario_id is not null;

create unique index if not exists idx_planning_rows_key_company_only
  on public.planning_matrix_rows (company_id, row_key)
  where scenario_id is null;

create index if not exists idx_planning_rows_company on public.planning_matrix_rows (company_id);
create index if not exists idx_planning_rows_scenario on public.planning_matrix_rows (scenario_id);

create table if not exists public.planning_matrix_cells (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.planning_matrix_rows (id) on delete cascade,
  period_month date not null,
  value numeric(18,4) not null default 0,
  source text not null default 'manual' check (source in ('manual', 'derived', 'import')),
  updated_at timestamptz not null default now(),
  unique (row_id, period_month)
);

create index if not exists idx_planning_cells_row on public.planning_matrix_cells (row_id);
create index if not exists idx_planning_cells_period on public.planning_matrix_cells (period_month);

-- RLS
alter table public.market_segments enable row level security;
alter table public.scenario_snapshots enable row level security;
alter table public.planning_matrix_rows enable row level security;
alter table public.planning_matrix_cells enable row level security;

create policy "market_segments_via_company" on public.market_segments
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = market_segments.company_id and m.user_id = auth.uid()
    )
  );

create policy "scenario_snapshots_via_scenario" on public.scenario_snapshots
  for all using (
    exists (
      select 1 from public.scenarios s
      join public.companies c on c.id = s.company_id
      join public.organization_members m on m.organization_id = c.organization_id
      where s.id = scenario_snapshots.scenario_id and m.user_id = auth.uid()
    )
  );

create policy "planning_rows_via_company" on public.planning_matrix_rows
  for all using (
    exists (
      select 1 from public.companies c
      join public.organization_members m on m.organization_id = c.organization_id
      where c.id = planning_matrix_rows.company_id and m.user_id = auth.uid()
    )
  );

create policy "planning_cells_via_row" on public.planning_matrix_cells
  for all using (
    exists (
      select 1 from public.planning_matrix_rows r
      join public.companies c on c.id = r.company_id
      join public.organization_members m on m.organization_id = c.organization_id
      where r.id = planning_matrix_cells.row_id and m.user_id = auth.uid()
    )
  );

create trigger planning_rows_updated before update on public.planning_matrix_rows
  for each row execute function public.set_updated_at();

create trigger planning_cells_updated before update on public.planning_matrix_cells
  for each row execute function public.set_updated_at();

comment on table public.planning_matrix_rows is 'Workbook row definitions for enterprise forecast matrix.';
comment on table public.planning_matrix_cells is 'Per-period editable or derived cell values.';
