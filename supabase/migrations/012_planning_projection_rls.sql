-- Planning projection RLS: member-scoped writes aligned with HR catalog and economics sync.
-- Replaces role-gated companies_org_write (viewer could read but not INSERT projection rows).

create or replace function public.is_company_accessible(_user uuid, _company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = _company_id
      and public.is_organization_member(_user, c.organization_id)
  );
$$;

revoke all on function public.is_company_accessible(uuid, uuid) from public;
grant execute on function public.is_company_accessible(uuid, uuid) to authenticated;

create or replace function public.is_scenario_accessible(_user uuid, _scenario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.scenarios s
    where s.id = _scenario_id
      and public.is_company_accessible(_user, s.company_id)
  );
$$;

revoke all on function public.is_scenario_accessible(uuid, uuid) from public;
grant execute on function public.is_scenario_accessible(uuid, uuid) to authenticated;

create or replace function public.is_revenue_stream_accessible(_user uuid, _stream_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.revenue_streams rs
    where rs.id = _stream_id
      and public.is_company_accessible(_user, rs.company_id)
  );
$$;

revoke all on function public.is_revenue_stream_accessible(uuid, uuid) from public;
grant execute on function public.is_revenue_stream_accessible(uuid, uuid) to authenticated;

create or replace function public.is_planning_row_accessible(_user uuid, _row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planning_matrix_rows r
    where r.id = _row_id
      and public.is_company_accessible(_user, r.company_id)
  );
$$;

revoke all on function public.is_planning_row_accessible(uuid, uuid) from public;
grant execute on function public.is_planning_row_accessible(uuid, uuid) to authenticated;

-- companies
drop policy if exists "companies_org_access" on public.companies;
drop policy if exists "companies_org_write" on public.companies;
drop policy if exists "companies_org_update" on public.companies;

create policy "companies_select_member" on public.companies
  for select
  to authenticated
  using (public.is_organization_member(auth.uid(), organization_id));

create policy "companies_insert_member" on public.companies
  for insert
  to authenticated
  with check (public.is_organization_member(auth.uid(), organization_id));

create policy "companies_update_member" on public.companies
  for update
  to authenticated
  using (public.is_organization_member(auth.uid(), organization_id))
  with check (public.is_organization_member(auth.uid(), organization_id));

-- Child tables scoped by company_id
drop policy if exists "portfolios_via_company" on public.portfolios;
create policy "portfolios_via_company" on public.portfolios
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

drop policy if exists "bu_via_company" on public.business_units;
create policy "bu_via_company" on public.business_units
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

drop policy if exists "streams_via_company" on public.revenue_streams;
create policy "streams_via_company" on public.revenue_streams
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

drop policy if exists "scenarios_via_company" on public.scenarios;
create policy "scenarios_via_company" on public.scenarios
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

drop policy if exists "forecasts_via_company" on public.forecasts;
create policy "forecasts_via_company" on public.forecasts
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

drop policy if exists "opps_via_company" on public.opportunities;
create policy "opps_via_company" on public.opportunities
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

drop policy if exists "kpi_via_company" on public.kpi_snapshots;
create policy "kpi_via_company" on public.kpi_snapshots
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

-- Planning engine (002)
drop policy if exists "market_segments_via_company" on public.market_segments;
create policy "market_segments_via_company" on public.market_segments
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

drop policy if exists "scenario_snapshots_via_scenario" on public.scenario_snapshots;
create policy "scenario_snapshots_via_scenario" on public.scenario_snapshots
  for all
  to authenticated
  using (public.is_scenario_accessible(auth.uid(), scenario_id))
  with check (public.is_scenario_accessible(auth.uid(), scenario_id));

drop policy if exists "planning_rows_via_company" on public.planning_matrix_rows;
create policy "planning_rows_via_company" on public.planning_matrix_rows
  for all
  to authenticated
  using (public.is_company_accessible(auth.uid(), company_id))
  with check (public.is_company_accessible(auth.uid(), company_id));

drop policy if exists "planning_cells_via_row" on public.planning_matrix_cells;
create policy "planning_cells_via_row" on public.planning_matrix_cells
  for all
  to authenticated
  using (public.is_planning_row_accessible(auth.uid(), row_id))
  with check (public.is_planning_row_accessible(auth.uid(), row_id));

-- Deal tier lines (003)
drop policy if exists "rsdtl_via_stream" on public.revenue_stream_deal_tier_lines;
create policy "rsdtl_via_stream" on public.revenue_stream_deal_tier_lines
  for all
  to authenticated
  using (public.is_revenue_stream_accessible(auth.uid(), revenue_stream_id))
  with check (public.is_revenue_stream_accessible(auth.uid(), revenue_stream_id));

-- Org-scoped tiers (not company FK)
drop policy if exists "tiers_via_org" on public.deal_size_tiers;
create policy "tiers_via_org" on public.deal_size_tiers
  for all
  to authenticated
  using (public.is_organization_member(auth.uid(), organization_id))
  with check (public.is_organization_member(auth.uid(), organization_id));
