import { describe, expect, it } from "vitest";
import {
  applyPlanningClientModelToWorkspaceState,
  mapPlanningDtoToClientModel,
} from "./workspace-from-server";
import type { PlanningWorkspaceDTO } from "@/server/planning/workspace";

describe("workspace-from-server", () => {
  it("maps HR-linked companies for executive workspace", () => {
    const dto: PlanningWorkspaceDTO = {
      source: "supabase",
      organization: { id: "org-1", name: "HoldCo" },
      companies: [
        {
          id: "co-uuid-1",
          name: "Creative Studio",
          organization_id: "org-1",
          fixed_costs_monthly: 120000,
          baseline_revenue_monthly: 500000,
          growth_target_pct: 0.15,
          margin_target_pct: 0.4,
          np_target_pct: 0.12,
          market_segments: [],
          metadata: { syncSource: "hr_catalog", hrBusinessUnitId: "bu_hr_1" },
        },
      ],
      company_hr_links: [{ company_id: "co-uuid-1", hr_business_unit_id: "bu_hr_1" }],
      revenue_streams: [
        {
          id: "st-1",
          company_id: "co-uuid-1",
          name: "Delivery",
          contribution_margin_pct: 0.38,
          revenue_weight: 1,
          avg_deal_size: 0,
          growth_rate_pct: 0.1,
          conversion_rate_pct: 0.2,
          sales_cycle_days: 60,
          metadata: { hrDepartmentId: "dept_1" },
        },
      ],
      scenarios: [
        {
          id: "sc-1",
          company_id: "co-uuid-1",
          name: "Baseline",
          is_baseline: true,
          assumptions: { npTargetPct: 0.12 },
        },
      ],
      opportunities: [],
      forecasts: [],
      planning_rows: [],
      planning_cells: [],
      deal_tier_lines: [],
    };

    const model = mapPlanningDtoToClientModel("org-1", dto, dto.company_hr_links);
    expect(model.companies[0]?.name).toBe("Creative Studio");
    expect(model.companies[0]?.hrBusinessUnitId).toBe("bu_hr_1");
    expect(model.companies[0]?.fixedCostsMonthly).toBe(120000);

    const applied = applyPlanningClientModelToWorkspaceState(model);
    expect(applied.selectedCompanyId).toBe("");
    expect(applied.companies[0]?.hrBusinessUnitId).toBe("bu_hr_1");
    expect(applied.streams[0]?.name).toBe("Delivery");

    const preserved = applyPlanningClientModelToWorkspaceState(model, {
      preserveSelectedCompanyId: "co-uuid-1",
    });
    expect(preserved.selectedCompanyId).toBe("co-uuid-1");
    expect(preserved.selectedScenarioId).toBe("sc-1");
  });
});
