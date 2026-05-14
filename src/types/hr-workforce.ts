/**
 * HR Capacity & Workforce Cost Planning — domain types.
 * Independent module; no coupling to sales-plan or service costing.
 */

export type EmploymentType = "full_time" | "part_time" | "contractor" | "freelancer";

export type AdditionalCostType = "fixed" | "variable" | "percentage";

export type RecurringType = "monthly" | "yearly" | "one_time";

/** Delivery = sold / billable capacity; Indirect = admin & overhead workforce (not in OH FTE denominator). */
export type OperationalRoleType = "delivery" | "indirect";

/** Basis for percentage-type additional costs (engine-resolved). */
export type PercentageCostBasis =
  | "salary_only"
  | "salary_plus_benefits"
  | "subtotal_before_risk"
  | "loaded_cost"
  | "custom";

export interface HrBusinessUnit {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HrDepartment {
  id: string;
  /** Owning business unit (holding structure). */
  businessUnitId: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HrTeam {
  id: string;
  departmentId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobRoleAdditionalCost {
  id: string;
  costName: string;
  amount: number;
  costType: AdditionalCostType;
  recurring: RecurringType;
  /** When costType === percentage — selects numerator for % rows. */
  percentageBasis?: PercentageCostBasis;
}

export interface JobRole {
  id: string;
  /** Denormalized for filters; should match department's business unit. */
  businessUnitId: string;
  departmentId: string;
  teamId?: string | null;
  name: string;
  employmentType: EmploymentType;
  employeeCount: number;
  currency: string;
  avgMonthlySalary: number;
  avgMonthlySocialInsurance: number;
  /** Annual amount — engine converts to monthly */
  annualMedicalInsurance: number;
  annualEndOfServiceCost: number;
  /** 0 = none, 20 = +20% on subtotal before hourly split */
  riskFactorPct: number;
  /** Legacy reporting flags; kept in sync with operationalRoleType when set from UI. */
  isBillable: boolean;
  includeInOhAllocation: boolean;
  /**
   * Delivery = capacity counted in OH billable denominator when deriving from roles.
   * Indirect = non-sold / admin workforce (composed OH indirect pool); excluded from that denominator.
   * Older saves may still store support/management — normalized to indirect on load.
   */
  operationalRoleType?: OperationalRoleType;
  additionalCosts: JobRoleAdditionalCost[];
  archived?: boolean;
}

/** Editable global HR parameters (per workspace / org in future). */
export interface HrGlobalSettings {
  workingDaysPerWeek: number;
  workingHoursPerDay: number;
  weeksPerYear: number;
  offDaysPerYear: number;
  defaultCurrency: string;
  /**
   * When false, the UI hides the team layer (portfolio / BU → department → roles only).
   * Operational rollups ignore team membership checks. Default true when omitted (legacy).
   */
  useTeamLevel?: boolean;
}

export type OhBillableFteSource = "manual" | "from_roles";

/** Named non-payroll overhead lines (rent, software, etc.). */
export interface OhNonWorkforceLine {
  id: string;
  name: string;
  amount: number;
  recurring: "monthly" | "yearly";
  notes?: string;
  active: boolean;
  /** Optional grouping (Facilities, IT, G&A, …). */
  category?: string;
}

/** Manual OH inputs (may be automated later). */
export interface OhManualSettings {
  utilizationRatePct: number;
  /** Used when billableFteSource === manual (or as fallback). */
  billableEmployeeCount: number;
  totalAnnualOverhead: number;
  /**
   * manual: use billableEmployeeCount.
   * from_roles: sum headcount for roles classified as Delivery (non-archived).
   */
  billableFteSource?: OhBillableFteSource;
  /**
   * When true, annual OH numerator = indirect non-billable workforce (std cost at OH rate 0)
   * + active non-workforce lines + totalAnnualOverhead (used as additional fixed bucket).
   * When false, numerator is totalAnnualOverhead only (legacy).
   */
  useComposedAnnualOh?: boolean;
  /** Rent, utilities, licenses, etc. Ignored unless useComposedAnnualOh. */
  ohNonWorkforceLines?: OhNonWorkforceLine[];
}

export interface OhComputationInputs extends HrGlobalSettings, OhManualSettings {}

export interface OhEngineResult {
  totalAnnualHoursPerEmployee: number;
  offHoursPerEmployeeYear: number;
  netAvailableHoursPerEmployeeYear: number;
  totalBillableHoursPerYear: number;
  totalBillableHoursPerMonth: number;
  ohRatePerHour: number;
  /** Echo of effective headcount used after source resolution. */
  effectiveBillableEmployeeCount: number;
}

/** Resolved annual OH numerator (single manual field vs composed build-up). */
export interface OhNumeratorDetail {
  composed: boolean;
  totalNumerator: number;
  indirectWorkforceAnnualStd: number;
  nonWorkforceLinesAnnual: number;
  additionalAnnualOverhead: number;
}

export interface RoleCostBreakdown {
  roleId: string;
  monthlyBaseCost: number;
  monthlyAdditionalCosts: number;
  monthlySubtotalBeforeRisk: number;
  monthlyTotalCost: number;
  annualTotalCost: number;
  standardHourlyCost: number;
  ohAdjustedHourlyCost: number;
}

export interface WorkforceCostEngineInput {
  settings: HrGlobalSettings;
  ohRatePerHour: number;
  roles: JobRole[];
}

export type ImportStatus = "pending" | "success" | "failed";

export interface HrImportLogEntry {
  id: string;
  createdAt: string;
  fileName: string;
  rowCount: number;
  status: ImportStatus;
  message?: string;
}

export interface HrSnapshotMeta {
  id: string;
  createdAt: string;
  label: string;
  /** App serialization / restore semantics version at capture time. */
  engineVersion?: number;
  /** Workforce + OH formula bundle version at capture time. */
  formulaVersion?: number;
}

/** Snapshot payload versions (restore handles all). */
export type HrSnapshotPayloadV2 = {
  v: 2;
  /**
   * Serialization / payload shape version (optional on older saves; treated as 1 when absent).
   */
  engineVersion?: number;
  /**
   * Workforce cost + OH definition version (optional on older saves; treated as 1 when absent).
   */
  formulaVersion?: number;
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  roles: JobRole[];
  hrGlobalSettings: HrGlobalSettings;
  /**
   * Legacy single OH block (pre per-BU). When `ohManualByBusinessUnitId` is absent,
   * restore merges this into every business unit in the payload.
   */
  ohManual?: OhManualSettings;
  /** OH manual inputs keyed by `businessUnitId`. */
  ohManualByBusinessUnitId?: Record<string, OhManualSettings>;
};

export type HrSnapshotPayloadV1 = {
  v: 1;
  departments: HrDepartment[];
  teams: HrTeam[];
  roles: JobRole[];
  hrGlobalSettings: HrGlobalSettings;
  ohManual: OhManualSettings;
};
