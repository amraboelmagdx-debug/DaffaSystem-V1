import { z } from "zod";

const isoString = z.string().min(1);

const hrBusinessUnitSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const hrDepartmentSchema = z
  .object({
    id: z.string().min(1),
    businessUnitId: z.string().min(1),
    name: z.string(),
    code: z.string().optional(),
    isActive: z.boolean(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const hrTeamSchema = z
  .object({
    id: z.string().min(1),
    departmentId: z.string().min(1),
    name: z.string(),
    isActive: z.boolean(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const jobRoleAdditionalCostSchema = z
  .object({
    id: z.string().min(1),
    costName: z.string(),
    amount: z.number(),
    costType: z.enum(["fixed", "variable", "percentage"]),
    recurring: z.enum(["monthly", "yearly", "one_time"]),
    percentageBasis: z
      .enum([
        "salary_only",
        "salary_plus_benefits",
        "subtotal_before_risk",
        "loaded_cost",
        "custom",
      ])
      .optional(),
  })
  .passthrough();

const jobRoleSchema = z
  .object({
    id: z.string().min(1),
    businessUnitId: z.string().min(1),
    departmentId: z.string().min(1),
    teamId: z.string().nullable().optional(),
    name: z.string(),
    employmentType: z.enum(["full_time", "part_time", "contractor", "freelancer"]),
    employeeCount: z.number(),
    currency: z.string(),
    avgMonthlySalary: z.number(),
    avgMonthlySocialInsurance: z.number(),
    annualMedicalInsurance: z.number(),
    annualEndOfServiceCost: z.number(),
    riskFactorPct: z.number(),
    isBillable: z.boolean(),
    includeInOhAllocation: z.boolean(),
    operationalRoleType: z.enum(["delivery", "indirect"]).optional(),
    additionalCosts: z.array(jobRoleAdditionalCostSchema),
    archived: z.boolean().optional(),
  })
  .passthrough();

const hrGlobalSettingsSchema = z
  .object({
    workingDaysPerWeek: z.number(),
    workingHoursPerDay: z.number(),
    weeksPerYear: z.number(),
    offDaysPerYear: z.number(),
    defaultCurrency: z.string().min(1),
    useTeamLevel: z.boolean().optional(),
  })
  .passthrough();

const ohNonWorkforceLineSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    amount: z.number(),
    recurring: z.enum(["monthly", "yearly"]),
    notes: z.string().optional(),
    active: z.boolean(),
    category: z.string().optional(),
  })
  .passthrough();

const ohManualSettingsSchema = z
  .object({
    utilizationRatePct: z.number(),
    billableEmployeeCount: z.number(),
    totalAnnualOverhead: z.number(),
    billableFteSource: z.enum(["manual", "from_roles"]).optional(),
    useComposedAnnualOh: z.boolean().optional(),
    ohNonWorkforceLines: z.array(ohNonWorkforceLineSchema).optional(),
  })
  .passthrough();

const hrImportLogEntrySchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoString,
    fileName: z.string(),
    rowCount: z.number(),
    status: z.enum(["pending", "success", "failed"]),
    message: z.string().optional(),
  })
  .passthrough();

const hrSnapshotRecordSchema = z
  .object({
    meta: z
      .object({
        id: z.string().min(1),
        createdAt: isoString,
        label: z.string(),
        engineVersion: z.number().optional(),
        formulaVersion: z.number().optional(),
      })
      .passthrough(),
    payloadJson: z.string(),
  })
  .passthrough();

/** Mirrors Zustand HR store `partialize` output. */
export const hrWorkforceCatalogPayloadSchema = z.object({
  businessUnits: z.array(hrBusinessUnitSchema),
  departments: z.array(hrDepartmentSchema),
  teams: z.array(hrTeamSchema),
  roles: z.array(jobRoleSchema),
  hrGlobalSettings: hrGlobalSettingsSchema,
  ohManualByBusinessUnitId: z.record(z.string(), ohManualSettingsSchema),
  importLogs: z.array(hrImportLogEntrySchema).optional(),
  snapshots: z.array(hrSnapshotRecordSchema).optional(),
});

export type HrWorkforceCatalogPayload = z.infer<typeof hrWorkforceCatalogPayloadSchema>;

export const hrCatalogPutBodySchema = z.object({
  catalog: hrWorkforceCatalogPayloadSchema,
  engineVersion: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
});

export type HrCatalogPutBody = z.infer<typeof hrCatalogPutBodySchema>;
