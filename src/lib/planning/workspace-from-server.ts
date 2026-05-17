import type { PlanningWorkspaceDTO } from "@/server/planning/workspace";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream, DemoScenario } from "@/types/domain";
import type { OpportunityStage } from "@/types/domain";
import type { PlanningWorkspaceClientModel } from "@/lib/platform-economics/types";

function metaField(meta: unknown, key: string): string | undefined {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
  const v = (meta as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}

function metaRetired(meta: unknown): boolean {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  return Boolean((meta as Record<string, unknown>).hrRetiredAt);
}

export function mapPlanningDtoToClientModel(
  organizationId: string,
  dto: PlanningWorkspaceDTO,
  hrLinks: Array<{ company_id: string; hr_business_unit_id: string }>
): PlanningWorkspaceClientModel {
  const hrByCompany = new Map(
    hrLinks.map((l) => [l.company_id, l.hr_business_unit_id])
  );

  const companies: DemoCompany[] = (dto.companies ?? [])
    .filter((c) => !metaRetired(c.metadata))
    .map((c) => {
      const meta = c.metadata;
      const segments = Array.isArray(c.market_segments)
        ? (c.market_segments as string[])
        : [];
      return {
        id: c.id,
        name: c.name,
        organizationId,
        ...((): { hrBusinessUnitId?: string } => {
          const id = hrByCompany.get(c.id) ?? metaField(c.metadata, "hrBusinessUnitId");
          return id ? { hrBusinessUnitId: id } : {};
        })(),
        fixedCostsMonthly: Number(c.fixed_costs_monthly ?? 0),
        growthTargetPct: Number(c.growth_target_pct ?? 0),
        marginTargetPct: Number(c.margin_target_pct ?? 0),
        npTargetPct: Number(c.np_target_pct ?? 0),
        revenueMonthly: Number(c.baseline_revenue_monthly ?? 0),
        contributionMarginPct: Number(c.margin_target_pct ?? 0.38),
        marketSegments: segments,
      };
    });

  const streams: DemoRevenueStream[] = (dto.revenue_streams ?? []).map((s) => ({
    id: String(s.id),
    companyId: String(s.company_id),
    name: String(s.name ?? ""),
    hrDepartmentId: metaField(s.metadata, "hrDepartmentId") ?? null,
    contributionMarginPct: Number(s.contribution_margin_pct ?? 0.38),
    revenueWeight: Number(s.revenue_weight ?? 0),
    avgDealSize: Number(s.avg_deal_size ?? 0),
    growthRatePct: Number(s.growth_rate_pct ?? 0),
    conversionRatePct: Number(s.conversion_rate_pct ?? 0),
    salesCycleDays: Number(s.sales_cycle_days ?? 60),
  })) as DemoRevenueStream[] & { hrDepartmentId?: string | null };

  const scenarios: DemoScenario[] = (dto.scenarios ?? []).map((sc) => {
    const a =
      sc.assumptions && typeof sc.assumptions === "object" && !Array.isArray(sc.assumptions)
        ? (sc.assumptions as Record<string, number>)
        : {};
    return {
      id: String(sc.id),
      companyId: String(sc.company_id),
      name: String(sc.name ?? "Scenario"),
      baseline: Boolean(sc.is_baseline),
      npTargetPct: Number(a.npTargetPct ?? 0.12),
      revenueMixAdj: Number(a.revenueMixAdj ?? 0),
      conversionRateAdj: Number(a.conversionRateAdj ?? 0),
      fixedCostAdj: Number(a.fixedCostAdj ?? 0),
      growthAdj: Number(a.growthAdj ?? 0),
      pipelineWeightAdj: Number(a.pipelineWeightAdj ?? 0),
    };
  });

  const opportunities: DemoOpportunity[] = (dto.opportunities ?? []).map((o) => ({
    id: String(o.id),
    companyId: String(o.company_id),
    clientName: String(o.client_name ?? o.name ?? ""),
    name: String(o.name ?? ""),
    stage: (o.stage as OpportunityStage) ?? "discovery",
    probabilityPct: Number(o.probability_pct ?? 0.25),
    dealValue: Number(o.deal_value ?? o.amount ?? 0),
    revenueStreamId: String(o.revenue_stream_id ?? ""),
    marketSegment: String(o.market_segment ?? ""),
    riskScore: Number(o.risk_score ?? 0),
  }));

  return {
    organizationId,
    organizationName: dto.organization?.name ?? null,
    companies,
    streams,
    scenarios,
    opportunities,
  };
}

export function applyPlanningClientModelToWorkspaceState(model: PlanningWorkspaceClientModel): {
  companies: DemoCompany[];
  streams: DemoRevenueStream[];
  scenarios: DemoScenario[];
  opportunities: DemoOpportunity[];
  selectedCompanyId: string;
  selectedScenarioId: string;
} {
  const companies = model.companies.map((c) => ({ ...c }));
  const streams = model.streams.map((s) => {
    const { hrDepartmentId: _h, ...rest } = s as DemoRevenueStream & { hrDepartmentId?: string | null };
    return rest;
  });
  const scenarios = model.scenarios.map((s) => ({ ...s }));
  const opportunities = model.opportunities.map((o) => ({ ...o }));
  const selectedCompanyId = companies[0]?.id ?? "";
  const scenariosForCo = scenarios.filter((s) => s.companyId === selectedCompanyId);
  const selectedScenarioId = scenariosForCo[0]?.id ?? scenarios[0]?.id ?? "";
  return {
    companies,
    streams,
    scenarios,
    opportunities,
    selectedCompanyId,
    selectedScenarioId,
  };
}
