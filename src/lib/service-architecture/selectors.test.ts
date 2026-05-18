import { describe, expect, it } from "vitest";
import type { JobRole } from "@/types/hr-workforce";
import type { ServiceTemplate } from "@/types/service-architecture";
import { getJobRolesForTemplateBusinessUnit } from "./selectors";

function roleStub(
  partial: Pick<JobRole, "id" | "businessUnitId" | "name"> & { archived?: boolean }
): JobRole {
  return {
    departmentId: "dept-1",
    employmentType: "full_time",
    employeeCount: 1,
    currency: "SAR",
    avgMonthlySalary: 0,
    avgMonthlySocialInsurance: 0,
    annualMedicalInsurance: 0,
    annualEndOfServiceCost: 0,
    riskFactorPct: 0,
    isBillable: true,
    includeInOhAllocation: true,
    additionalCosts: [],
    archived: false,
    ...partial,
  };
}

function templateStub(
  partial: Pick<ServiceTemplate, "id" | "serviceFamilyId" | "businessUnitId">
): ServiceTemplate {
  return {
    name: "Template",
    code: "TPL",
    description: "",
    lifecycle: "active",
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("getJobRolesForTemplateBusinessUnit", () => {
  it("returns only job roles in the template business unit", () => {
    const result = getJobRolesForTemplateBusinessUnit({
      templateId: "template-1",
      templates: [
        templateStub({
          id: "template-1",
          serviceFamilyId: "family-1",
          businessUnitId: "bu-a",
        }),
      ],
      roles: [
        roleStub({ id: "role-a", businessUnitId: "bu-a", name: "Consultant" }),
        roleStub({ id: "role-b", businessUnitId: "bu-b", name: "Architect" }),
        roleStub({ id: "role-c", businessUnitId: "bu-a", name: "Old role", archived: true }),
      ],
    });
    expect(result.map((r) => r.id)).toEqual(["role-a"]);
  });
});
