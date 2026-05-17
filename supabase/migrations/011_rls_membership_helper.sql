-- Fix organization_members RLS infinite recursion and align link-table policies.
-- Child policies that subquery organization_members rely on a non-recursive membership SELECT.

create or replace function public.is_organization_member(_user uuid, _org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = _user
      and m.organization_id = _org
  );
$$;

revoke all on function public.is_organization_member(uuid, uuid) from public;
grant execute on function public.is_organization_member(uuid, uuid) to authenticated;

drop policy if exists "org_members_self_read" on public.organization_members;

create policy "org_members_select" on public.organization_members
  for select
  to authenticated
  using (public.is_organization_member(auth.uid(), organization_id));

-- company_hr_unit_links (007) — use helper; split write policy
drop policy if exists "company_hr_unit_links_select" on public.company_hr_unit_links;
drop policy if exists "company_hr_unit_links_write" on public.company_hr_unit_links;

create policy "company_hr_unit_links_select" on public.company_hr_unit_links
  for select
  to authenticated
  using (public.is_organization_member(auth.uid(), organization_id));

create policy "company_hr_unit_links_insert" on public.company_hr_unit_links
  for insert
  to authenticated
  with check (public.is_organization_member(auth.uid(), organization_id));

create policy "company_hr_unit_links_update" on public.company_hr_unit_links
  for update
  to authenticated
  using (public.is_organization_member(auth.uid(), organization_id))
  with check (public.is_organization_member(auth.uid(), organization_id));

create policy "company_hr_unit_links_delete" on public.company_hr_unit_links
  for delete
  to authenticated
  using (public.is_organization_member(auth.uid(), organization_id));

-- deal_economics_runs (010)
drop policy if exists "deal_economics_runs_select" on public.deal_economics_runs;
drop policy if exists "deal_economics_runs_insert" on public.deal_economics_runs;

create policy "deal_economics_runs_select" on public.deal_economics_runs
  for select
  to authenticated
  using (public.is_organization_member(auth.uid(), organization_id));

create policy "deal_economics_runs_insert" on public.deal_economics_runs
  for insert
  to authenticated
  with check (public.is_organization_member(auth.uid(), organization_id));
