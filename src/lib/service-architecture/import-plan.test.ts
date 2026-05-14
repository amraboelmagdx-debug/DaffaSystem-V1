import { describe, expect, it } from "vitest";
import { buildServiceCatalogImportPlan } from "./import-plan";

describe("buildServiceCatalogImportPlan", () => {
  it("normalizes and deduplicates by stable codes", () => {
    const result = buildServiceCatalogImportPlan([
      {
        serviceFamilyCode: "ops",
        serviceFamilyName: "Operations",
        serviceTierCode: "std",
        serviceTierName: "Standard",
        serviceTemplateCode: "tplA",
        serviceTemplateName: "Template A",
        businessUnitId: "bu-1",
        deliveryPhaseCode: "disc",
        deliveryPhaseName: "Discovery",
        phaseSortOrder: 1,
        deliverableCode: "d-1",
        deliverableName: "Blueprint",
      },
      {
        serviceFamilyCode: "OPS",
        serviceFamilyName: "Operations",
        serviceTierCode: "STD",
        serviceTierName: "Standard",
        serviceTemplateCode: "TPLA",
        serviceTemplateName: "Template A",
        businessUnitId: "bu-1",
        deliveryPhaseCode: "DISC",
        deliveryPhaseName: "Discovery",
        phaseSortOrder: 1,
        deliverableCode: "D-1",
        deliverableName: "Blueprint",
      },
    ]);

    expect(result.valid).toBe(true);
    expect(result.preview.totalsByEntity.serviceFamily).toBe(1);
    expect(result.preview.totalsByEntity.serviceTier).toBe(1);
    expect(result.preview.totalsByEntity.serviceTemplate).toBe(1);
    expect(result.preview.totalsByEntity.deliveryPhase).toBe(1);
    expect(result.preview.totalsByEntity.serviceDeliverable).toBe(1);
  });
});

