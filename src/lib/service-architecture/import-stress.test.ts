import { describe, expect, it } from "vitest";
import { buildServiceCatalogImportPlan } from "./import-plan";

const baseRow = {
  serviceFamilyName: "Family",
  serviceTierName: "Tier",
  serviceTemplateName: "Template",
  businessUnitId: "bu-1",
  deliveryPhaseName: "Phase",
  deliverableName: "Deliverable",
  phaseSortOrder: 0,
};

describe("import plan stress cases", () => {
  it("rejects cross-family reuse of the same tier code without data collision in plan", () => {
    const r1 = {
      ...baseRow,
      serviceFamilyCode: "BRAND",
      serviceTierCode: "TINY",
      serviceTemplateCode: "TPL1",
      deliveryPhaseCode: "DISC",
      deliverableCode: "D1",
    };
    const r2 = {
      ...baseRow,
      serviceFamilyCode: "MOTION",
      serviceTierCode: "TINY",
      serviceTemplateCode: "TPL2",
      deliveryPhaseCode: "DISC",
      deliverableCode: "D2",
    };
    const result = buildServiceCatalogImportPlan([r1, r2]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("different family"))).toBe(true);
  });

  it("rejects template code mapped to a different business unit on a later row", () => {
    const r1 = {
      ...baseRow,
      serviceFamilyCode: "F1",
      serviceTierCode: "S",
      serviceTemplateCode: "SHARED",
      businessUnitId: "bu-a",
      deliveryPhaseCode: "P1",
      deliverableCode: "X1",
    };
    const r2 = {
      ...r1,
      businessUnitId: "bu-b",
      deliverableCode: "X2",
    };
    const result = buildServiceCatalogImportPlan([r1, r2]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === "businessUnitId")).toBe(true);
  });

  it("requires every row to carry full phase + deliverable columns (wide rows only)", () => {
    const result = buildServiceCatalogImportPlan([
      {
        serviceFamilyCode: "F",
        serviceFamilyName: "F",
        serviceTierCode: "T",
        serviceTierName: "T",
        serviceTemplateCode: "TP",
        serviceTemplateName: "TP",
        businessUnitId: "bu",
        deliveryPhaseCode: "P",
        deliveryPhaseName: "P",
        phaseSortOrder: 0,
        deliverableCode: "",
        deliverableName: "D",
      },
    ]);
    expect(result.valid).toBe(false);
  });

  it("handles many deliverable rows for one template-tier-phase without duplicating catalog phases", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      ...baseRow,
      serviceFamilyCode: "FAM",
      serviceTierCode: "STD",
      serviceTemplateCode: "TPL",
      deliveryPhaseCode: "DES",
      deliverableCode: `D${i}`,
      deliverableName: `Artifact ${i}`,
    }));
    const result = buildServiceCatalogImportPlan(rows);
    expect(result.valid).toBe(true);
    expect(result.preview.totalsByEntity.deliveryPhase).toBe(1);
    expect(result.preview.totalsByEntity.serviceDeliverable).toBe(25);
  });

  it("does not produce role allocations in the import plan (allocation gap)", () => {
    const result = buildServiceCatalogImportPlan([
      {
        ...baseRow,
        serviceFamilyCode: "FAM",
        serviceTierCode: "STD",
        serviceTemplateCode: "TPL",
        deliveryPhaseCode: "DES",
        deliverableCode: "D1",
      },
    ]);
    expect(result.valid).toBe(true);
    expect("serviceRoleAllocations" in result.plan).toBe(false);
  });
});
