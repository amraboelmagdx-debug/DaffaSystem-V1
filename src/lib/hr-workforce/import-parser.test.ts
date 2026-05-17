import { describe, expect, it } from "vitest";
import { guessColumnMap, matchImportHeader } from "./import-parser";
import { buildImportPlan } from "./import-dry-run";
import type { ParsedImportRow } from "./import-parser";

describe("guessColumnMap", () => {
  it("maps Annual EOS Cost and Risk Factor % from template headers", () => {
    const headers = [
      "Business Unit",
      "Department",
      "Team",
      "Role Name",
      "Employment Type",
      "Employee Count",
      "Monthly Salary",
      "Monthly Social Insurance",
      "Annual Medical Insurance",
      "Annual EOS Cost",
      "Risk Factor %",
      "Is Billable",
      "Additional Costs",
    ];
    const map = guessColumnMap(headers);
    expect(map.annualEosCost).toBe("Annual EOS Cost");
    expect(map.riskFactorPct).toBe("Risk Factor %");
    expect(map.additionalCosts).toBe("Additional Costs");
  });

  it("maps EOS when header uses abbreviated label", () => {
    expect(matchImportHeader(["EOS (annual)"], { includes: ["eos"] })).toBe("EOS (annual)");
  });
});

describe("buildImportPlan replaceExisting", () => {
  const headers = ["Business Unit", "Department", "Role Name", "Annual EOS Cost", "Risk Factor %"];
  const columnMap = guessColumnMap([
    ...headers,
    "Employment Type",
    "Employee Count",
    "Monthly Salary",
    "Monthly Social Insurance",
    "Annual Medical Insurance",
    "Is Billable",
    "Additional Costs",
  ]);

  const row: ParsedImportRow = {
    rowIndex: 2,
    values: {
      "Business Unit": "Acme Holdings",
      Department: "Finance",
      "Role Name": "CFO",
      "Annual EOS Cost": "24000",
      "Risk Factor %": "8",
      "Employment Type": "full_time",
      "Employee Count": "1",
      "Monthly Salary": "50000",
      "Monthly Social Insurance": "0",
      "Annual Medical Insurance": "0",
      "Is Billable": "false",
      "Additional Costs": "",
    },
  };

  it("does not keep Main/General when replacing", () => {
    const existing = {
      businessUnits: [
        {
          id: "bu-main",
          name: "Main",
          code: "MAIN",
          description: "",
          isActive: true,
          createdAt: "t",
          updatedAt: "t",
        },
      ],
      departments: [
        {
          id: "dept-gen",
          businessUnitId: "bu-main",
          name: "General",
          code: "",
          isActive: true,
          createdAt: "t",
          updatedAt: "t",
        },
      ],
      teams: [],
      defaultCurrency: "SAR",
    };

    const plan = buildImportPlan(existing, [row], columnMap, { replaceExisting: true });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.deltas.businessUnits.map((u) => u.name)).toEqual(["Acme Holdings"]);
    expect(plan.deltas.departments.map((d) => d.name)).toEqual(["Finance"]);
    expect(plan.deltas.roles[0]?.annualEndOfServiceCost).toBe(24000);
    expect(plan.deltas.roles[0]?.riskFactorPct).toBe(8);
  });
});
