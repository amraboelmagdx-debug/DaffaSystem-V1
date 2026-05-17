-- Phase 2.2: allow org members to insert/update their HR workforce catalog row.

create policy "hr_workforce_catalog_insert_member" on public.hr_workforce_catalog
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = hr_workforce_catalog.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy "hr_workforce_catalog_update_member" on public.hr_workforce_catalog
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = hr_workforce_catalog.organization_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = hr_workforce_catalog.organization_id
        and m.user_id = auth.uid()
    )
  );
