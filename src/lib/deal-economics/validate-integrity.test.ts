import { describe, expect, it } from "vitest";

import type { ServiceCostCatalogSlice } from "@/lib/service-cost-simulation/types";
import {
  validateStreamServiceTemplateLink,
  validateTemplateBelongsToBusinessUnit,
} from "./validate-integrity";

const catalog: ServiceCostCatalogSlice = {
  serviceTemplates: [
    {
      id: "tpl-a",
      serviceFamilyId: "fam",
      businessUnitId: "bu-a",
      name: "A",
      code: "A",
      isActive: true,
    },
    {
      id: "tpl-b",
      serviceFamilyId: "fam",
      businessUnitId: "bu-b",
      name: "B",
      code: "B",
      isActive: true,
    },
  ],
  serviceTiers: [],
  serviceTemplateTiers: [],
  deliveryPhases: [],
  serviceTemplateTierPhases: [],
  serviceDeliverables: [],
  serviceRoleAllocations: [],
};

describe("validateStreamServiceTemplateLink", () => {
  it("allows template when stream BU matches", () => {
    expect(validateStreamServiceTemplateLink(catalog, "tpl-a", "bu-a")).toBeNull();
  });

  it("rejects cross-BU template link", () => {
    const err = validateStreamServiceTemplateLink(catalog, "tpl-b", "bu-a");
    expect(err).toMatch(/belongs to BU bu-b/);
  });

  it("rejects when stream has no BU", () => {
    expect(validateStreamServiceTemplateLink(catalog, "tpl-a", null)).toMatch(/HR business unit/);
  });
});

describe("validateTemplateBelongsToBusinessUnit", () => {
  it("returns null for matching BU", () => {
    expect(validateTemplateBelongsToBusinessUnit(catalog, "tpl-a", "bu-a")).toBeNull();
  });
});
