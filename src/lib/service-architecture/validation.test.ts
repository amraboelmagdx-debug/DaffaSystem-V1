import { describe, expect, it } from "vitest";
import { validateTemplateTierFamilyConsistency } from "./validation";

describe("validateTemplateTierFamilyConsistency", () => {
  it("rejects tier linked to different family than template", () => {
    const issues = validateTemplateTierFamilyConsistency({
      templateTier: {
        serviceTemplateId: "template-1",
        serviceTierId: "tier-1",
      },
      templates: [{ id: "template-1", serviceFamilyId: "family-a" }],
      tiers: [{ id: "tier-1", serviceFamilyId: "family-b" }],
    });
    expect(issues.some((issue) => issue.field === "serviceTierId")).toBe(true);
  });

  it("accepts matching family links", () => {
    const issues = validateTemplateTierFamilyConsistency({
      templateTier: {
        serviceTemplateId: "template-1",
        serviceTierId: "tier-1",
      },
      templates: [{ id: "template-1", serviceFamilyId: "family-a" }],
      tiers: [{ id: "tier-1", serviceFamilyId: "family-a" }],
    });
    expect(issues).toEqual([]);
  });
});

