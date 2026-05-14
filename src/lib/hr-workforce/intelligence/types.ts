import type { OperationalRoleType } from "@/types/hr-workforce";

/** Analytics-only segmentation (Delivery / Support / Management) — does not replace persisted `operationalRoleType`. */
export type WorkforceSegment = "delivery" | "support" | "management";

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export interface ExecutiveTrend {
  /** Prior period monthly workforce cost (org-wide operational), if computable from snapshots. */
  priorMonthlyWorkforceCost: number | null;
  deltaPct: number | null;
  direction: TrendDirection;
  /**
   * When set, delta was intentionally hidden (e.g. BU-scoped view while snapshots replay org-wide).
   */
  suppressedReason?: "snapshot_org_only";
}

export interface ExecutiveKpi {
  id: string;
  valueLabel: string;
  /** Short operational interpretation (shown in tooltip / insight). */
  interpretationKey: string;
  trend?: ExecutiveTrend;
}

export interface NamedCount {
  id: string;
  name: string;
  count: number;
}

export interface NamedAmount {
  id: string;
  name: string;
  monthly: number;
}

export interface OrgDistribution {
  byBusinessUnit: NamedCount[];
  byDepartment: NamedCount[];
  byTeam: NamedCount[];
  deliveryHeadcount: number;
  supportHeadcount: number;
  managementHeadcount: number;
  indirectLegacyHeadcount: number;
}

export interface SpanAndDensity {
  avgRolesPerDepartment: number;
  managementRatio: number;
  /** Herfindahl-Hirschman–style concentration on department monthly cost shares (0–1). */
  departmentCostConcentration: number;
}

export interface StructureHygiene {
  inactiveDepartments: number;
  inactiveTeams: number;
  archivedRoles: number;
}

export interface CostConcentration {
  topRoles: NamedAmount[];
  topDepartments: NamedAmount[];
}

export interface EconomicsRatios {
  deliveryPayrollShare: number;
  indirectBurdenShare: number;
  /** Approx. monthly OH dollars loaded (Σ hourly OH surcharge × hours × HC) / monthly total payroll. */
  monthlyOhLoadRatio: number;
}

export interface OhCompositionMonthly {
  indirectWorkforce: number;
  rent: number;
  software: number;
  legal: number;
  utilities: number;
  infrastructure: number;
  miscellaneous: number;
  additionalOverheadBucket: number;
}

export interface OhBurdenRatios {
  ohToDeliveryPayroll: number;
  ohToTotalPayroll: number;
}

export interface BuBenchmarkRow {
  businessUnitId: string;
  name: string;
  ohRatePerHour: number;
  monthlyWorkforceCost: number;
  deliveryRatio: number;
  indirectBurdenPct: number;
  avgLoadedHourly: number;
  monthlyBillableHours: number;
}

export interface CapacitySnapshot {
  totalDeliveryBillableHoursPerMonth: number;
  /** Theoretical capacity if utilization were 100% with same headcount & net hours. */
  theoreticalBillableHoursPerMonthAtFullUtil: number;
  lostHoursPerMonthVsFullUtil: number;
  utilizationRatePct: number;
}

export interface RoleSegmentCost {
  segment: WorkforceSegment;
  headcount: number;
  monthlyPayroll: number;
}

export type WorkforceAlertSeverity = "info" | "warning";

export interface WorkforceAlert {
  id: string;
  severity: WorkforceAlertSeverity;
  titleKey: string;
  bodyKey: string;
}

export interface WorkforceIntelligence {
  generatedAt: string;
  currency: string;
  /** Primary BU for OH scenario defaults (first active BU). */
  primaryBusinessUnitId: string;
  executive: {
    totalMonthlyWorkforceCost: number;
    totalHeadcount: number;
    deliveryHeadcount: number;
    indirectHeadcount: number;
    orgWideOhRatePerHour: number;
    /** delivery payroll / total payroll (0–1). */
    workforceEfficiencyRatio: number;
    deliveryVsIndirectRatio: number;
    avgLoadedHourly: number;
    capacityUtilizationPct: number;
    workforceCostConcentrationTop3Pct: number;
  };
  org: {
    distribution: OrgDistribution;
    span: SpanAndDensity;
    hygiene: StructureHygiene;
  };
  economics: {
    concentration: CostConcentration;
    ratios: EconomicsRatios;
  };
  oh: {
    compositionMonthly: OhCompositionMonthly;
    burden: OhBurdenRatios;
  };
  capacity: CapacitySnapshot;
  benchmarking: BuBenchmarkRow[];
  roleSegments: RoleSegmentCost[];
  alerts: WorkforceAlert[];
  trend: ExecutiveTrend;
}
