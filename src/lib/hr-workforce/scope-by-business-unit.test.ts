import { describe, expect, it } from "vitest";
import {
  belongsToBusinessUnit,
  filterBusinessUnitsForBu,
  filterDepartmentsForBu,
  filterRolesForBu,
} from "./scope-by-business-unit";
import type { HrBusinessUnit, HrDepartment, JobRole } from "@/types/hr-workforce";

const units: HrBusinessUnit[] = [
  { id: "bu-a", name: "A", code: "", description: "", isActive: true, createdAt: "", updatedAt: "" },
  { id: "bu-b", name: "B", code: "", description: "", isActive: true, createdAt: "", updatedAt: "" },
];

const departments: HrDepartment[] = [
  {
    id: "d1",
    businessUnitId: "bu-a",
    name: "Dept A",
    code: "",
    isActive: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "d2",
    businessUnitId: "bu-b",
    name: "Dept B",
    code: "",
    isActive: true,
    createdAt: "",
    updatedAt: "",
  },
];

const roles: JobRole[] = [
  {
    id: "r1",
    businessUnitId: "bu-a",
    departmentId: "d1",
    name: "Role A",
    employmentType: "full_time",
    employeeCount: 1,
    monthlySalary: 1,
    monthlySocialInsurance: 0,
    annualMedicalInsurance: 0,
    annualEndOfServiceCost: 0,
    riskFactorPct: 0,
    isBillable: true,
    additionalCosts: [],
    archived: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "r2",
    businessUnitId: "bu-b",
    departmentId: "d2",
    name: "Role B",
    employmentType: "full_time",
    employeeCount: 1,
    monthlySalary: 1,
    monthlySocialInsurance: 0,
    annualMedicalInsurance: 0,
    annualEndOfServiceCost: 0,
    riskFactorPct: 0,
    isBillable: true,
    additionalCosts: [],
    archived: false,
    createdAt: "",
    updatedAt: "",
  },
];

describe("scope-by-business-unit", () => {
  it("returns all rows when scope id is empty", () => {
    expect(filterBusinessUnitsForBu(units, null)).toEqual(units);
    expect(filterDepartmentsForBu(departments, undefined)).toEqual(departments);
    expect(filterRolesForBu(roles, "")).toEqual(roles);
  });

  it("filters to a single business unit", () => {
    expect(filterBusinessUnitsForBu(units, "bu-a")).toEqual([units[0]]);
    expect(filterDepartmentsForBu(departments, "bu-a")).toEqual([departments[0]]);
    expect(filterRolesForBu(roles, "bu-a")).toEqual([roles[0]]);
  });

  it("belongsToBusinessUnit respects scope", () => {
    expect(belongsToBusinessUnit("bu-a", null)).toBe(true);
    expect(belongsToBusinessUnit("bu-a", "bu-a")).toBe(true);
    expect(belongsToBusinessUnit("bu-b", "bu-a")).toBe(false);
  });
});
