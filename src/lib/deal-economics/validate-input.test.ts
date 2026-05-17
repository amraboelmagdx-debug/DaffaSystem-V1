import { describe, expect, it } from "vitest";
import { validateDealEconomicsInput } from "./validate-input";

describe("validateDealEconomicsInput", () => {
  it("requires BU and template ids", () => {
    const r = validateDealEconomicsInput({
      organizationId: "org-1",
      hrBusinessUnitId: "",
      serviceTemplateId: "tpl-1",
      serviceTierId: "tier-1",
      currency: "SAR",
      lines: [{ id: "l1", label: "Line", quantity: 1 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("hrBusinessUnitId"))).toBe(true);
  });

  it("accepts minimal valid input", () => {
    const r = validateDealEconomicsInput({
      organizationId: "org-1",
      hrBusinessUnitId: "bu-zan",
      serviceTemplateId: "tpl-1",
      serviceTierId: "tier-1",
      currency: "SAR",
      lines: [{ id: "l1", label: "Line", quantity: 2 }],
    });
    expect(r.ok).toBe(true);
  });
});
