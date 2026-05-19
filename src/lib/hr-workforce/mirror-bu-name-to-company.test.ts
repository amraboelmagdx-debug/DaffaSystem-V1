import { beforeEach, describe, expect, it } from "vitest";
import { mirrorBuNameToLinkedCompany } from "@/lib/hr-workforce/mirror-bu-name-to-company";
import { useSalesPlanWizardStore } from "@/stores/use-sales-plan-wizard-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

describe("mirrorBuNameToLinkedCompany", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      companies: [
        {
          id: "co-1",
          name: "Old Name",
          organizationId: "org-1",
          hrBusinessUnitId: "bu-1",
          fixedCostsMonthly: 0,
          growthTargetPct: 0,
          marginTargetPct: 0,
          npTargetPct: 0,
          revenueMonthly: 0,
          contributionMarginPct: 0,
          marketSegments: [],
        },
      ],
      selectedCompanyId: "co-1",
      selectedScenarioId: "",
      streams: [],
      opportunities: [],
      scenarios: [],
      scenarioBundles: {},
      tierLineOverrides: {},
    });
    useSalesPlanWizardStore.setState({
      meta: { portfolioName: "Old Name", planningScenarioName: "" },
    });
  });

  it("updates linked company name and wizard portfolio when selected", () => {
    const companyId = mirrorBuNameToLinkedCompany("bu-1", "  New Name  ");
    expect(companyId).toBe("co-1");
    expect(useWorkspaceStore.getState().companies[0]?.name).toBe("New Name");
    expect(useSalesPlanWizardStore.getState().meta.portfolioName).toBe("New Name");
  });

  it("returns null when no linked company exists", () => {
    const companyId = mirrorBuNameToLinkedCompany("bu-missing", "X");
    expect(companyId).toBeNull();
  });

  it("returns null for empty trimmed name", () => {
    const companyId = mirrorBuNameToLinkedCompany("bu-1", "   ");
    expect(companyId).toBeNull();
    expect(useWorkspaceStore.getState().companies[0]?.name).toBe("Old Name");
  });
});
