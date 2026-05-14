-- Workbook-aligned: revenue stream × deal tier planning lines (LOTF-style matrix rows)
-- Each line carries tier CM% and the stream-block driver weight (Excel column E on block head row).

create table if not exists public.revenue_stream_deal_tier_lines (
  id uuid primary key default gen_random_uuid(),
  revenue_stream_id uuid not null references public.revenue_streams (id) on delete cascade,
  tier_key text not null check (tier_key in ('tiny', 'standard', 'big', 'mega')),
  contribution_margin_pct numeric(8,4) not null,
  mix_pct_within_stream numeric(8,4) not null default 0.25,
  block_weight_pct numeric(8,4),
  sort_order int not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revenue_stream_id, tier_key)
);

create index if not exists idx_rsdtl_stream on public.revenue_stream_deal_tier_lines (revenue_stream_id);

comment on table public.revenue_stream_deal_tier_lines is
  'Per-tier margins within a revenue stream. block_weight_pct mirrors Excel E on the first row of each stream block for D16-style rollup; when null, engine falls back to mix_pct_within_stream only.';

alter table public.revenue_stream_deal_tier_lines enable row level security;

drop policy if exists "rsdtl_via_stream" on public.revenue_stream_deal_tier_lines;
create policy "rsdtl_via_stream" on public.revenue_stream_deal_tier_lines
  for all using (
    exists (
      select 1 from public.revenue_streams rs
      join public.companies c on c.id = rs.company_id
      join public.organization_members m on m.organization_id = c.organization_id
      where rs.id = revenue_stream_deal_tier_lines.revenue_stream_id
        and m.user_id = auth.uid()
    )
  );

create trigger rsdtl_updated before update on public.revenue_stream_deal_tier_lines
  for each row execute function public.set_updated_at();
