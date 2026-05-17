import { describe, expect, it } from "vitest";
import { validateSaAgainstHrCatalog } from "@/server/service/validate-catalog-references";
import type { HrWorkforceCatalogPayload } from "@/server/validation/hr-catalog-schema";
import type { ServiceArchitectureCatalogPayload } from "@/server/validation/service-catalog-schema";

const hrCatalog: HrWorkforceCatalogPayload = {
  businessUnits: [{ id: "bu-1", name: "BU", code: "BU", isActive: true } as HrWorkforceCatalogPayload["businessUnits"][0]],
  departments: [],
  teams: [],
  roles: [{ id: "role-1", businessUnitId: "bu-1", departmentId: "d-1" } as HrWorkforceCatalogPayload["roles"][0]],
  hrGlobalSettings: {} as HrWorkforceCatalogPayload["hrGlobalSettings"],
  ohManualByBusinessUnitId: {},
  importLogs: [],
  snapshots: [],
};

const saCatalog: ServiceArchitectureCatalogPayload = {
  serviceFamilies: [],
  serviceTiers: [],
  serviceTemplates: [
    {
      id: "tpl-1",
      serviceFamilyId: "fam-1",
      businessUnitId: "bu-1",
      name: "T",
      code: "T",
      lifecycle: "draft",
      version: 1,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    },
  ],
  serviceTemplateTiers: [],
  deliveryPhases: [],
  serviceTemplateTierPhases: [],
  serviceDeliverables: [],
  serviceRoleAllocations: [
    {
      id: "alloc-1",
      serviceTemplateTierPhaseId: "phase-1",
      jobRoleId: "role-1",
      allocatedHours: 8,
      lifecycle: "draft",
      version: 1,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    },
  ],
};

describe("validateSaAgainstHrCatalog", () => {
  it("requires HR catalog row", () => {
    const issues = validateSaAgainstHrCatalog(saCatalog, null);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("flags unknown business unit on template", () => {
    const bad = {
      ...saCatalog,
      serviceTemplates: [{ ...saCatalog.serviceTemplates[0]!, businessUnitId: "bu-missing" }],
    };
    const issues = validateSaAgainstHrCatalog(bad, hrCatalog);
    expect(issues.some((i) => i.path.includes("businessUnitId"))).toBe(true);
  });

  it("flags unknown job role on allocation", () => {
    const bad = {
      ...saCatalog,
      serviceRoleAllocations: [{ ...saCatalog.serviceRoleAllocations[0]!, jobRoleId: "role-missing" }],
    };
    const issues = validateSaAgainstHrCatalog(bad, hrCatalog);
    expect(issues.some((i) => i.path.includes("jobRoleId"))).toBe(true);
  });

  it("passes when HR refs resolve", () => {
    const issues = validateSaAgainstHrCatalog(saCatalog, hrCatalog);
    expect(issues).toHaveLength(0);
  });
});
