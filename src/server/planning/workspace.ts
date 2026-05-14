import { createRouteSupabaseClient } from "@/lib/supabase/route-handler";

export type PlanningWorkspaceDTO = {
  source: "supabase";
  organization: { id: string; name: string } | null;
  companies: Array<{
    id: string;
    name: string;
    organization_id: string;
    fixed_costs_monthly: number;
    baseline_revenue_monthly: number | null;
    growth_target_pct: number;
    margin_target_pct: number;
    np_target_pct: number;
    market_segments: unknown;
  }>;
  revenue_streams: Array<Record<string, unknown>>;
  scenarios: Array<Record<string, unknown>>;
  opportunities: Array<Record<string, unknown>>;
  forecasts: Array<Record<string, unknown>>;
  planning_rows: Array<Record<string, unknown>>;
  planning_cells: Array<Record<string, unknown>>;
  /** Joined `revenue_stream_deal_tier_lines` for all streams in workspace (optional). */
  deal_tier_lines: Array<Record<string, unknown>>;
};

export async function loadPlanningWorkspace(): Promise<
  PlanningWorkspaceDTO | { source: "none"; message: string }
> {
  const supabase = await createRouteSupabaseClient();
  if (!supabase) {
    return { source: "none", message: "Supabase is not configured." };
  }

  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("id,name")
    .limit(5);
  if (orgErr) {
    return { source: "none", message: orgErr.message };
  }
  const organization = orgs?.[0] ?? null;
  if (!organization) {
    return { source: "none", message: "No organization found for this user." };
  }

  const orgId = organization.id;

  const { data: companies, error: coErr } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (coErr) {
    return { source: "none", message: coErr.message };
  }

  const companyIds = (companies ?? []).map((c) => c.id as string);
  if (!companyIds.length) {
    return {
      source: "supabase",
      organization,
      companies: [],
      revenue_streams: [],
      scenarios: [],
      opportunities: [],
      forecasts: [],
      planning_rows: [],
      planning_cells: [],
      deal_tier_lines: [],
    };
  }

  const [streamsRes, scenariosRes, oppsRes, forecastsRes, rowsRes] =
    await Promise.all([
      supabase.from("revenue_streams").select("*").in("company_id", companyIds),
      supabase.from("scenarios").select("*").in("company_id", companyIds),
      supabase.from("opportunities").select("*").in("company_id", companyIds),
      supabase.from("forecasts").select("*").in("company_id", companyIds),
      supabase.from("planning_matrix_rows").select("*").in("company_id", companyIds),
    ]);

  const streamsData = streamsRes.data ?? [];
  const streamIds = streamsData.map((s) => s.id as string);
  let deal_tier_lines: Record<string, unknown>[] = [];
  if (streamIds.length) {
    const { data: tierData } = await supabase
      .from("revenue_stream_deal_tier_lines")
      .select("*")
      .in("revenue_stream_id", streamIds);
    deal_tier_lines = tierData ?? [];
  }

  const rowIds = (rowsRes.data ?? []).map((r) => r.id as string);
  let planning_cells: Record<string, unknown>[] = [];
  if (rowIds.length) {
    const { data: cellRows } = await supabase
      .from("planning_matrix_cells")
      .select("*")
      .in("row_id", rowIds);
    planning_cells = cellRows ?? [];
  }

  return {
    source: "supabase",
    organization,
    companies: (companies ?? []) as PlanningWorkspaceDTO["companies"],
    revenue_streams: streamsData,
    scenarios: scenariosRes.data ?? [],
    opportunities: oppsRes.data ?? [],
    forecasts: forecastsRes.data ?? [],
    planning_rows: rowsRes.data ?? [],
    planning_cells,
    deal_tier_lines,
  };
}
