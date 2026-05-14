-- Optional seed: run in SQL editor after creating an auth user and org.
-- Replace placeholders:
--   :user_id   -> auth.users.id
--   :org_id    -> new organization id (or use gen_random_uuid() in insert)

-- Example (uncomment and edit):
/*
insert into public.organizations (id, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'Demo Holdings', 'demo-holdings');

insert into public.organization_members (organization_id, user_id, role)
values ('00000000-0000-4000-8000-000000000001', ':user_id', 'admin');

insert into public.companies (id, organization_id, name, fixed_costs_monthly, growth_target_pct, margin_target_pct, np_target_pct)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Northwind Consulting',
  420000,
  0.18,
  0.42,
  0.12
);

insert into public.deal_size_tiers (organization_id, level_key, label, min_value, max_value, avg_deal_size, expected_margin_pct, close_probability_pct, sales_cycle_days, forecast_weight, effort_score, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'tiny', 'Tiny', 0, 25000, 12000, 0.28, 0.35, 30, 0.8, 1, 0),
  ('00000000-0000-4000-8000-000000000001', 'standard', 'Standard', 25000, 100000, 60000, 0.35, 0.28, 60, 1, 2, 1),
  ('00000000-0000-4000-8000-000000000001', 'big', 'Big', 100000, 500000, 220000, 0.4, 0.2, 90, 1.1, 4, 2),
  ('00000000-0000-4000-8000-000000000001', 'mega', 'Mega', 500000, null, 900000, 0.45, 0.12, 120, 1.25, 5, 3);
*/
