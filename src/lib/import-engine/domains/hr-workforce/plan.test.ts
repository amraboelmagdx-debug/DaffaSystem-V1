import { describe, expect, it } from "vitest";
import { buildTemplateBlob, parseWorkbook } from "@/lib/import-engine/workbook";
import { buildHrTemplate } from "./template";
import { planHrUpload } from "./plan";
import type { HrSnapshot } from "./snapshot";

function emptySnapshot(): HrSnapshot {
  return {
    businessUnits: [],
    departments: [],
    teams: [],
    roles: [],
    globalSettings: {
      workingDaysPerWeek: 5,
      workingHoursPerDay: 8,
      weeksPerYear: 52,
      offDaysPerYear: 30,
      defaultCurrency: "SAR",
      useTeamLevel: true,
    },
    ohManualByBusinessUnitId: {},
  };
}

describe("HR import engine — template round-trip", () => {
  it("builds a blank template that includes every data sheet", async () => {
    const spec = buildHrTemplate(emptySnapshot(), "blank");
    const blob = buildTemplateBlob(spec);
    const buf = await blob.arrayBuffer();
    const wb = parseWorkbook(buf);
    const names = wb.sheets.map((s) => s.name);
    expect(names).toContain("Business Units");
    expect(names).toContain("Departments");
    expect(names).toContain("Roles");
    expect(names).toContain("Global Settings");
    expect(names).toContain("OH Manual");
    expect(names).toContain("OH Non-Workforce Lines");
  });
});

describe("HR import engine — dry-run with OH", () => {
  it("creates new BUs, depts, roles and applies OH manual + global settings", async () => {
    const spec = buildHrTemplate(emptySnapshot(), "blank");
    // Manually craft a workbook payload like the user would fill.
    const wb = parseWorkbook(await buildTemplateBlob(spec).arrayBuffer());
    // Replace the example rows with deterministic ones via a simple synthetic workbook.
    const synthetic = {
      sheets: [
        {
          name: "Business Units",
          headers: ["Id (leave blank for new)", "Name *", "Code", "Description", "Active"],
          rows: [
            {
              rowIndex: 2,
              values: {
                "Id (leave blank for new)": "",
                "Name *": "ZAN",
                Code: "ZAN",
                Description: "Saudi unit",
                Active: "true",
              },
            },
          ],
        },
        {
          name: "Departments",
          headers: ["Business Unit *", "Id (leave blank for new)", "Department name *", "Code", "Active"],
          rows: [
            {
              rowIndex: 2,
              values: {
                "Business Unit *": "ZAN",
                "Id (leave blank for new)": "",
                "Department name *": "Engineering",
                Code: "ENG",
                Active: "true",
              },
            },
          ],
        },
        {
          name: "Roles",
          headers: [
            "Business Unit *",
            "Department *",
            "Team",
            "Id (leave blank for new)",
            "Role name *",
            "Employment type *",
            "Operational role type *",
            "Employee count *",
            "Currency",
            "Monthly salary",
            "Monthly social insurance",
            "Annual medical insurance",
            "Annual EOS cost",
            "Risk factor %",
            "Is billable",
            "Include in OH allocation",
            "Archived",
            "Additional costs",
          ],
          rows: [
            {
              rowIndex: 2,
              values: {
                "Business Unit *": "ZAN",
                "Department *": "Engineering",
                Team: "",
                "Id (leave blank for new)": "",
                "Role name *": "Senior Engineer",
                "Employment type *": "full_time",
                "Operational role type *": "delivery",
                "Employee count *": "3",
                Currency: "SAR",
                "Monthly salary": "18000",
                "Monthly social insurance": "1200",
                "Annual medical insurance": "6000",
                "Annual EOS cost": "24000",
                "Risk factor %": "5",
                "Is billable": "true",
                "Include in OH allocation": "true",
                Archived: "false",
                "Additional costs": "",
              },
            },
          ],
        },
        {
          name: "Global Settings",
          headers: [
            "Working days per week *",
            "Working hours per day *",
            "Weeks per year *",
            "Off days per year *",
            "Default currency *",
            "Use team level",
          ],
          rows: [
            {
              rowIndex: 2,
              values: {
                "Working days per week *": "5",
                "Working hours per day *": "8",
                "Weeks per year *": "52",
                "Off days per year *": "30",
                "Default currency *": "SAR",
                "Use team level": "true",
              },
            },
          ],
        },
        {
          name: "OH Manual",
          headers: [
            "Business Unit *",
            "Utilization rate % *",
            "Billable employee count (manual)",
            "Total annual overhead",
            "Billable FTE source",
            "Use composed annual OH",
          ],
          rows: [
            {
              rowIndex: 2,
              values: {
                "Business Unit *": "ZAN",
                "Utilization rate % *": "82",
                "Billable employee count (manual)": "12",
                "Total annual overhead": "600000",
                "Billable FTE source": "manual",
                "Use composed annual OH": "false",
              },
            },
          ],
        },
        {
          name: "OH Non-Workforce Lines",
          headers: [
            "Business Unit *",
            "Id (leave blank for new)",
            "Line name *",
            "Category",
            "Amount *",
            "Recurring",
            "Active",
            "Notes",
          ],
          rows: [
            {
              rowIndex: 2,
              values: {
                "Business Unit *": "ZAN",
                "Id (leave blank for new)": "",
                "Line name *": "Office rent",
                Category: "Facilities",
                "Amount *": "25000",
                Recurring: "monthly",
                Active: "true",
                Notes: "",
              },
            },
          ],
        },
      ],
    };
    // Use synthetic workbook for the test (parseWorkbook output shape).
    void wb;
    const result = planHrUpload(synthetic as never, emptySnapshot());
    expect(result.ok, JSON.stringify(result.issues, null, 2)).toBe(true);
    expect(result.deltas?.businessUnits).toHaveLength(1);
    expect(result.deltas?.departments).toHaveLength(1);
    expect(result.deltas?.roles).toHaveLength(1);
    expect(result.deltas?.roles[0]?.annualEndOfServiceCost).toBe(24000);
    expect(result.deltas?.globalSettings?.defaultCurrency).toBe("SAR");
    const buId = result.deltas?.businessUnits[0]?.id;
    expect(buId).toBeTruthy();
    expect(result.deltas?.ohManualByBusinessUnitId?.[buId!]).toBeTruthy();
    expect(result.deltas?.ohManualByBusinessUnitId?.[buId!]?.totalAnnualOverhead).toBe(600000);
    expect(result.deltas?.ohManualByBusinessUnitId?.[buId!]?.ohNonWorkforceLines?.[0]?.amount).toBe(
      25000
    );
  });

  it("flags an unresolved business unit reference as error", () => {
    const synthetic = {
      sheets: [
        {
          name: "Departments",
          headers: ["Business Unit *", "Department name *"],
          rows: [
            {
              rowIndex: 2,
              values: { "Business Unit *": "Unknown", "Department name *": "Finance" },
            },
          ],
        },
      ],
    };
    const result = planHrUpload(synthetic as never, emptySnapshot());
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "unresolved_ref")).toBe(true);
  });
});

describe("HR import engine — upsert by id", () => {
  it("updates an existing BU and inserts a new one", () => {
    const snapshot: HrSnapshot = {
      ...emptySnapshot(),
      businessUnits: [
        {
          id: "bu_existing",
          name: "Old name",
          code: "OLD",
          description: "",
          isActive: true,
          createdAt: "t",
          updatedAt: "t",
        },
      ],
    };
    const synthetic = {
      sheets: [
        {
          name: "Business Units",
          headers: ["Id (leave blank for new)", "Name *", "Code", "Description", "Active"],
          rows: [
            {
              rowIndex: 2,
              values: {
                "Id (leave blank for new)": "bu_existing",
                "Name *": "Renamed",
                Code: "NEW",
                Description: "",
                Active: "true",
              },
            },
            {
              rowIndex: 3,
              values: {
                "Id (leave blank for new)": "",
                "Name *": "Brand new",
                Code: "NEW2",
                Description: "",
                Active: "true",
              },
            },
          ],
        },
      ],
    };
    const result = planHrUpload(synthetic as never, snapshot);
    expect(result.ok).toBe(true);
    const summary = result.changeSummary.find((r) => r.entity === "Business Units");
    expect(summary?.inserts).toBe(1);
    expect(summary?.updates).toBe(1);
    const renamed = result.deltas?.businessUnits.find((u) => u.id === "bu_existing");
    expect(renamed?.name).toBe("Renamed");
    expect(renamed?.code).toBe("NEW");
  });
});
