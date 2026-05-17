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
    metadata?: unknown;
  }>;
  company_hr_links: Array<{
    company_id: string;
    hr_business_unit_id: string;
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

export async function loadPlanningWorkspace(
  organizationId: string
): Promise<PlanningWorkspaceDTO | { source: "none"; message: string }> {
  const supabase = await createRouteSupabaseClient();
  if (!supabase) {
    return { source: "none", message: "Supabase is not configured." };
  }

  const { data: organization, error: orgErr } = await supabase
    .from("organizations")
    .select("id,name")
    .eq("id", organizationId)
    .maybeSingle();
  if (orgErr) {
    return { source: "none", message: orgErr.message };
  }
  if (!organization) {
    return {
      source: "none",
      message: "Organization not found or access denied.",
    };
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
      company_hr_links: [],
    };
  }

  const { data: hrLinks } = await supabase
    .from("company_hr_unit_links")
    .select("company_id, hr_business_unit_id")
    .eq("organization_id", orgId);

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
    company_hr_links: (hrLinks ?? []) as PlanningWorkspaceDTO["company_hr_links"],
    revenue_streams: streamsData,
    scenarios: scenariosRes.data ?? [],
    opportunities: oppsRes.data ?? [],
    forecasts: forecastsRes.data ?? [],
    planning_rows: rowsRes.data ?? [],
    planning_cells,
    deal_tier_lines,
  };
}
