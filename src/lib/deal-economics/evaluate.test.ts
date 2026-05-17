import { describe, expect, it } from "vitest";
import { deriveWorkspaceProjection } from "@/lib/hr-workforce/workspace-projection";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import type { ServiceCostCatalogSlice } from "@/lib/service-cost-simulation/types";
import type { HrGlobalSettings } from "@/types/hr-workforce";
import { evaluateDealEconomics } from "./evaluate";
import { validateDealEconomicsIntegrity } from "./validate-integrity";

const ts = "2020-01-01T00:00:00.000Z";

function makeCatalog(): ServiceCostCatalogSlice {
  const fam = {
    id: "fam-1",
    name: "Family",
    code: "FAM",
    lifecycle: "active" as const,
    version: 1,
    createdAt: ts,
    updatedAt: ts,
  };
  const tier1 = {
    id: "tier-1",
    serviceFamilyId: "fam-1",
    name: "Standard",
    code: "STD",
    lifecycle: "active" as const,
    version: 1,
    createdAt: ts,
    updatedAt: ts,
  };
  const tier2 = {
    ...tier1,
    id: "tier-2",
    name: "Premium",
    code: "PRM",
  };
  const tpl1 = {
    id: "tpl-1",
    serviceFamilyId: "fam-1",
    businessUnitId: "bu-1",
    name: "Template A",
    code: "TPA",
    lifecycle: "active" as const,
    version: 1,
    createdAt: ts,
    updatedAt: ts,
  };
  const tpl2 = {
    ...tpl1,
    id: "tpl-2",
    name: "Template B",
    code: "TPB",
  };
  return {
    serviceFamilies: [fam],
    serviceTiers: [tier1, tier2],
    serviceTemplates: [tpl1, tpl2],
    serviceTemplateTiers: [
      {
        id: "tt-1",
        serviceTemplateId: "tpl-1",
        serviceTierId: "tier-1",
        lifecycle: "active",
        version: 1,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: "tt-2",
        serviceTemplateId: "tpl-2",
        serviceTierId: "tier-2",
        lifecycle: "active",
        version: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    deliveryPhases: [
      {
        id: "phase-1",
        name: "Discovery",
        code: "DISCOVERY",
        lifecycle: "active",
        version: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    serviceTemplateTierPhases: [
      {
        id: "ttp-1",
        serviceTemplateTierId: "tt-1",
        deliveryPhaseId: "phase-1",
        sortOrder: 1,
        lifecycle: "active",
        version: 1,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: "ttp-2",
        serviceTemplateTierId: "tt-2",
        deliveryPhaseId: "phase-1",
        sortOrder: 1,
        lifecycle: "active",
        version: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    serviceDeliverables: [],
    serviceRoleAllocations: [
      {
        id: "alloc-1",
        serviceTemplateTierPhaseId: "ttp-1",
        jobRoleId: "role-1",
        allocatedHours: 10,
        lifecycle: "active",
        version: 1,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: "alloc-2",
        serviceTemplateTierPhaseId: "ttp-2",
        jobRoleId: "role-1",
        allocatedHours: 20,
        lifecycle: "active",
        version: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
  };
}

const hrGlobalSettings: HrGlobalSettings = {
  defaultCurrency: "SAR",
  workingDaysPerWeek: 5,
  workingHoursPerDay: 8,
  weeksPerYear: 52,
  offDaysPerYear: 0,
  useTeamLevel: false,
};

const assumptions = {
  deliveryInefficiencyFactor: 1,
  qaSensitivityFactor: 1,
  designRevisionIntensityFactor: 1,
  coordinationLoadFactor: 1,
  managementLoadFactor: 1,
  clientReviewLagFactor: 1,
  implicitWrapLoadedCostFraction: 0,
};

const scenario = {
  id: "base",
  label: "Base",
  description: "",
  hoursMultiplier: 1,
  effortMultiplier: 1,
  coordinationMultiplier: 1,
  managementMultiplier: 1,
};

describe("evaluateDealEconomics", () => {
  const catalog = makeCatalog();
  const businessUnits = [
    {
      id: "bu-1",
      name: "ZAN",
      code: "",
      description: "",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
  const departments = [
    {
      id: "dept-1",
      businessUnitId: "bu-1",
      name: "Engineering",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
  const roles = [
    {
      id: "role-1",
      businessUnitId: "bu-1",
      departmentId: "dept-1",
      name: "Analyst",
      employmentType: "full_time" as const,
      employeeCount: 2,
      avgMonthlySalary: 15000,
      avgMonthlySocialInsurance: 0,
      annualMedicalInsurance: 0,
      annualEndOfServiceCost: 0,
      riskFactorPct: 0,
      isBillable: true,
      includeInOhAllocation: true,
      operationalRoleType: "delivery" as const,
      additionalCosts: [],
      currency: "SAR",
      archived: false,
    },
  ];
  const workforce = deriveWorkspaceProjection({
    roles,
    businessUnits,
    departments,
    teams: [],
    hrGlobalSettings,
    ohManualByBusinessUnitId: { "bu-1": { ...DEFAULT_OH } },
  });

  it("aggregates two lines with different templates under one BU", () => {
    const result = evaluateDealEconomics({
      input: {
        organizationId: "org-1",
        hrBusinessUnitId: "bu-1",
        companyId: "co-1",
        serviceTemplateId: "tpl-1",
        serviceTierId: "tier-1",
        currency: "SAR",
        lines: [
          {
            id: "line-1",
            label: "Service A",
            quantity: 1,
            serviceTemplateId: "tpl-1",
            serviceTierId: "tier-1",
          },
          {
            id: "line-2",
            label: "Service B",
            quantity: 2,
            serviceTemplateId: "tpl-2",
            serviceTierId: "tier-2",
          },
        ],
      },
      catalog,
      workforce,
      roles,
      businessUnitIds: ["bu-1"],
      companies: [{ id: "co-1", hrBusinessUnitId: "bu-1" }],
      assumptions,
      scenario,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lineResults).toHaveLength(2);
    expect(result.graph.hrBusinessUnitId).toBe("bu-1");
    expect(result.graphEdges.some((e) => e.kind === "tenant")).toBe(true);
    expect(result.rollup.loadedCost).toBeGreaterThan(0);
    expect(result.rollup.totalQuantity).toBe(3);
    expect(result.lineResults[1]!.measures.loadedCost).toBeGreaterThan(
      result.lineResults[0]!.measures.loadedCost
    );
  });

  it("rejects cross-BU template in integrity check", () => {
    const errors = validateDealEconomicsIntegrity(
      {
        organizationId: "org-1",
        hrBusinessUnitId: "bu-1",
        serviceTemplateId: "tpl-wrong",
        serviceTierId: "tier-1",
        currency: "SAR",
        lines: [{ id: "l1", label: "X", quantity: 1 }],
      },
      {
        ...catalog,
        serviceTemplates: [
          {
            ...catalog.serviceTemplates[0]!,
            id: "tpl-wrong",
            businessUnitId: "bu-other",
          },
        ],
      },
      new Map()
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/bu-other/);
  });
});
