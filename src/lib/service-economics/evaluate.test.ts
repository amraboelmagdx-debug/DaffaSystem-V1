import { describe, expect, it } from "vitest";
import { evaluateServiceEconomics } from "@/lib/service-economics/evaluate";
import type { ServiceCostCatalogSlice } from "@/lib/service-cost-simulation/types";

const catalog: ServiceCostCatalogSlice = {
  serviceTemplates: [
    {
      id: "tpl-1",
      serviceFamilyId: "fam-1",
      businessUnitId: "bu-1",
      name: "Template",
      code: "TPL",
      lifecycle: "active",
      version: 1,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    },
  ],
  serviceTiers: [
    {
      id: "tier-1",
      serviceFamilyId: "fam-1",
      name: "Standard",
      code: "STD",
      lifecycle: "active",
      version: 1,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    },
  ],
  serviceTemplateTiers: [
    {
      id: "tt-1",
      serviceTemplateId: "tpl-1",
      serviceTierId: "tier-1",
      lifecycle: "active",
      version: 1,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    },
  ],
  deliveryPhases: [
    {
      id: "phase-1",
      name: "Discovery",
      code: "DISCOVERY",
      lifecycle: "active",
      version: 1,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
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
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
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
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    },
  ],
};

describe("evaluateServiceEconomics", () => {
  it("fails when HR business unit is unknown", () => {
    const result = evaluateServiceEconomics({
      catalog,
      workforce: { breakdownByRoleId: new Map() } as never,
      roles: [{ id: "role-1", businessUnitId: "bu-1", name: "Analyst" }],
      businessUnitIds: [],
      serviceTemplateId: "tpl-1",
      serviceTierId: "tier-1",
      currency: "SAR",
      assumptions: {
        deliveryInefficiencyFactor: 1,
        qaSensitivityFactor: 1,
        designRevisionIntensityFactor: 1,
        coordinationLoadFactor: 1,
        managementLoadFactor: 1,
        clientReviewLagFactor: 1,
        implicitWrapLoadedCostFraction: 0,
      },
      scenario: {
        id: "base",
        label: "Base",
        description: "",
        hoursMultiplier: 1,
        effortMultiplier: 1,
        coordinationMultiplier: 1,
        managementMultiplier: 1,
      },
    });
    expect(result.ok).toBe(false);
  });
});
