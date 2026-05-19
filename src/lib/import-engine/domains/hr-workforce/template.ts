import { buildRefSheet } from "@/lib/import-engine/reference-builder";
import type { TemplateSpec } from "@/lib/import-engine/types";
import {
  HR_SHEET_NAMES,
  businessUnitColumns,
  departmentColumns,
  teamColumns,
  roleColumns,
  globalSettingsColumns,
  ohManualColumns,
  ohLineColumns,
} from "./columns";
import type { HrSnapshot } from "./snapshot";

export function buildHrTemplate(snapshot: HrSnapshot, mode: "blank" | "export"): TemplateSpec {
  const buByIdName = new Map(snapshot.businessUnits.map((b) => [b.id, b.name]));
  const deptByIdName = new Map(snapshot.departments.map((d) => [d.id, d.name]));
  const teamByIdName = new Map(snapshot.teams.map((t) => [t.id, t.name]));

  const buRows =
    mode === "export"
      ? snapshot.businessUnits.map((u) => ({
          id: u.id,
          name: u.name,
          code: u.code ?? "",
          description: u.description ?? "",
          isActive: u.isActive ? "true" : "false",
        }))
      : undefined;

  const departmentRows =
    mode === "export"
      ? snapshot.departments.map((d) => ({
          businessUnitName: buByIdName.get(d.businessUnitId) ?? "",
          id: d.id,
          name: d.name,
          code: d.code ?? "",
          isActive: d.isActive ? "true" : "false",
        }))
      : undefined;

  const teamRows =
    mode === "export"
      ? snapshot.teams.map((tm) => {
          const dept = snapshot.departments.find((d) => d.id === tm.departmentId);
          const bu = dept ? buByIdName.get(dept.businessUnitId) ?? "" : "";
          return {
            businessUnitName: bu,
            departmentName: dept?.name ?? "",
            id: tm.id,
            name: tm.name,
          };
        })
      : undefined;

  const roleRows =
    mode === "export"
      ? snapshot.roles.map((r) => {
          const dept = snapshot.departments.find((d) => d.id === r.departmentId);
          const bu = dept ? buByIdName.get(dept.businessUnitId) ?? "" : "";
          return {
            businessUnitName: bu,
            departmentName: dept?.name ?? "",
            teamName: r.teamId ? teamByIdName.get(r.teamId) ?? "" : "",
            id: r.id,
            name: r.name,
            employmentType: r.employmentType,
            operationalRoleType: r.operationalRoleType ?? "delivery",
            employeeCount: r.employeeCount,
            currency: r.currency,
            avgMonthlySalary: r.avgMonthlySalary,
            avgMonthlySocialInsurance: r.avgMonthlySocialInsurance,
            annualMedicalInsurance: r.annualMedicalInsurance,
            annualEndOfServiceCost: r.annualEndOfServiceCost,
            riskFactorPct: r.riskFactorPct,
            isBillable: r.isBillable ? "true" : "false",
            includeInOhAllocation: r.includeInOhAllocation ? "true" : "false",
            archived: r.archived ? "true" : "false",
            additionalCosts: r.additionalCosts
              .map((c) =>
                [c.costName, c.amount, c.costType, c.recurring, c.percentageBasis ?? ""]
                  .filter((s) => s !== "")
                  .join(":")
              )
              .join("|"),
          };
        })
      : undefined;

  const globalRows = [
    {
      workingDaysPerWeek: snapshot.globalSettings.workingDaysPerWeek,
      workingHoursPerDay: snapshot.globalSettings.workingHoursPerDay,
      weeksPerYear: snapshot.globalSettings.weeksPerYear,
      offDaysPerYear: snapshot.globalSettings.offDaysPerYear,
      defaultCurrency: snapshot.globalSettings.defaultCurrency,
      useTeamLevel: snapshot.globalSettings.useTeamLevel === false ? "false" : "true",
    },
  ];

  const ohManualRows = snapshot.businessUnits.map((u) => {
    const oh = snapshot.ohManualByBusinessUnitId[u.id];
    return {
      businessUnitName: u.name,
      utilizationRatePct: oh?.utilizationRatePct ?? 80,
      billableEmployeeCount: oh?.billableEmployeeCount ?? 0,
      totalAnnualOverhead: oh?.totalAnnualOverhead ?? 0,
      billableFteSource: oh?.billableFteSource ?? "manual",
      useComposedAnnualOh: oh?.useComposedAnnualOh ? "true" : "false",
    };
  });

  const ohLineRows =
    mode === "export"
      ? snapshot.businessUnits.flatMap((u) => {
          const lines = snapshot.ohManualByBusinessUnitId[u.id]?.ohNonWorkforceLines ?? [];
          return lines.map((line) => ({
            businessUnitName: u.name,
            id: line.id,
            name: line.name,
            category: line.category ?? "",
            amount: line.amount,
            recurring: line.recurring,
            active: line.active ? "true" : "false",
            notes: line.notes ?? "",
          }));
        })
      : undefined;

  return {
    fileName: "hr-workforce-import-template.xlsx",
    instructions: {
      title: "HR Workforce — import template",
      lines: [
        "Fill the data sheets below. Reference sheets show existing entities for lookups (read-only).",
        "Leave the Id column blank to insert a new entity, or paste an existing id to update.",
        "Foreign references (Business Unit, Department, Team) are matched by name — they must already exist or appear in this file.",
        "Order matters: complete Business Units → Departments → Teams → Roles → OH Manual / OH Non-Workforce Lines.",
        "Global Settings affects all units; the OH Manual sheet has one row per Business Unit.",
        "Booleans accept true/false (also yes/no, 1/0).",
        "Additional costs format: Name:Amount:fixed|percentage|variable:monthly|yearly|one_time[:basis] (separate multiple entries with |).",
      ],
    },
    referenceSheets: [
      buildRefSheet(
        "Existing Business Units",
        snapshot.businessUnits.map((u) => ({
          id: u.id,
          name: u.name,
          code: u.code ?? "",
          isActive: u.isActive ? "true" : "false",
        })),
        {
          description: "Read-only. Use the `name` (or `id`) when referencing from other sheets.",
          columnOrder: ["id", "name", "code", "isActive"],
        }
      ),
      buildRefSheet(
        "Existing Departments",
        snapshot.departments.map((d) => ({
          id: d.id,
          businessUnit: buByIdName.get(d.businessUnitId) ?? "",
          name: d.name,
          code: d.code ?? "",
        })),
        { columnOrder: ["id", "businessUnit", "name", "code"] }
      ),
      buildRefSheet(
        "Existing Teams",
        snapshot.teams.map((tm) => {
          const dept = snapshot.departments.find((d) => d.id === tm.departmentId);
          return {
            id: tm.id,
            businessUnit: dept ? buByIdName.get(dept.businessUnitId) ?? "" : "",
            department: dept?.name ?? "",
            name: tm.name,
          };
        }),
        { columnOrder: ["id", "businessUnit", "department", "name"] }
      ),
      buildRefSheet(
        "Existing Roles",
        snapshot.roles.map((r) => {
          const dept = snapshot.departments.find((d) => d.id === r.departmentId);
          return {
            id: r.id,
            businessUnit: dept ? buByIdName.get(dept.businessUnitId) ?? "" : "",
            department: dept?.name ?? "",
            team: r.teamId ? teamByIdName.get(r.teamId) ?? "" : "",
            name: r.name,
            employmentType: r.employmentType,
            operationalRoleType: r.operationalRoleType ?? "delivery",
            employeeCount: r.employeeCount,
          };
        }),
        {
          columnOrder: [
            "id",
            "businessUnit",
            "department",
            "team",
            "name",
            "employmentType",
            "operationalRoleType",
            "employeeCount",
          ],
        }
      ),
    ],
    sheets: [
      {
        name: HR_SHEET_NAMES.businessUnits,
        description: "Operational units (e.g. ZAN, Saudi delivery).",
        columns: businessUnitColumns,
        rows: buRows,
      },
      {
        name: HR_SHEET_NAMES.departments,
        description: "Departments scoped to a business unit.",
        columns: departmentColumns,
        rows: departmentRows,
      },
      {
        name: HR_SHEET_NAMES.teams,
        description: "Teams scoped to a department (optional).",
        columns: teamColumns,
        rows: teamRows,
      },
      {
        name: HR_SHEET_NAMES.roles,
        description: "Workforce headcount and unit costs.",
        columns: roleColumns,
        rows: roleRows,
      },
      {
        name: HR_SHEET_NAMES.globalSettings,
        description:
          "Single-row sheet with workspace-wide HR engine settings (working time + currency).",
        columns: globalSettingsColumns,
        rows: globalRows,
      },
      {
        name: HR_SHEET_NAMES.ohManual,
        description: "One row per Business Unit. Drives the OH engine.",
        columns: ohManualColumns,
        rows: ohManualRows,
      },
      {
        name: HR_SHEET_NAMES.ohLines,
        description:
          "Optional non-workforce overhead lines (rent, software, …). Only used when `Use composed annual OH` is true.",
        columns: ohLineColumns,
        rows: ohLineRows,
      },
    ],
    validationNotes: [
      "Errors will block the import. Warnings allow you to proceed.",
      "Lookup is case-insensitive on names.",
      "If a Role row points to a Business Unit / Department that is missing from this file and from the existing data, the row is rejected.",
      "Global Settings is optional — leave the sheet blank to keep current settings.",
    ],
  };
}
