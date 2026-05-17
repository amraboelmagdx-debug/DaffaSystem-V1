import { describe, expect, it } from "vitest";
import { buildServiceCatalogImportPlan } from "@/lib/service-architecture/import-plan";

describe("buildServiceCatalogImportPlan allocations", () => {
  it("emits serviceRoleAllocations for allocation-only rows", () => {
    const result = buildServiceCatalogImportPlan([
      {
        serviceFamilyCode: "ADV",
        serviceFamilyName: "Advisory",
        serviceTierCode: "STD",
        serviceTierName: "Standard",
        serviceTemplateCode: "OMB",
        serviceTemplateName: "Blueprint",
        businessUnitId: "bu-1",
        deliveryPhaseCode: "DISCOVERY",
        deliveryPhaseName: "Discovery",
        phaseSortOrder: 1,
        jobRoleId: "role-1",
        allocatedHours: 12,
        allocationNotes: "Workshop",
      },
    ]);

    expect(result.plan.serviceRoleAllocations).toHaveLength(1);
    expect(result.plan.serviceRoleAllocations[0]?.jobRoleId).toBe("role-1");
    expect(result.plan.serviceRoleAllocations[0]?.allocatedHours).toBe(12);
    expect(result.preview.totalsByEntity.serviceRoleAllocation).toBe(1);
  });
});
