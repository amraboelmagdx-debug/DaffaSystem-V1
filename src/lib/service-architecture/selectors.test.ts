import { describe, expect, it } from "vitest";
import { getJobRolesForTemplateBusinessUnit } from "./selectors";

describe("getJobRolesForTemplateBusinessUnit", () => {
  it("returns only job roles in the template business unit", () => {
    const result = getJobRolesForTemplateBusinessUnit({
      templateId: "template-1",
      templates: [{ id: "template-1", serviceFamilyId: "family-1", businessUnitId: "bu-a" } as any],
      roles: [
        { id: "role-a", businessUnitId: "bu-a", archived: false, name: "Consultant" } as any,
        { id: "role-b", businessUnitId: "bu-b", archived: false, name: "Architect" } as any,
        { id: "role-c", businessUnitId: "bu-a", archived: true, name: "Old role" } as any,
      ],
    });
    expect(result.map((r) => r.id)).toEqual(["role-a"]);
  });
});

