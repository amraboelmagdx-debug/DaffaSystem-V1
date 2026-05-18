import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  OhManualSettings,
} from "@/types/hr-workforce";
import type { CompareScenariosInput, ScenarioComparisonResult, ScenarioBundleEvaluation } from "@/types/scenario-comparison";

export type HrWorkforceSnapshot = {
  roles: JobRole[];
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  hrGlobalSettings: HrGlobalSettings;
  ohManualByBusinessUnitId: Record<string, OhManualSettings>;
};

export type OperationalFeasibilityStatus = "feasible" | "constrained" | "infeasible" | "unavailable";

export type FeasibilityMode = "hr_backed" | "unavailable";

export type UtilizationBand = "safe" | "elevated" | "critical";

export type HiringPressureLevel = "low" | "moderate" | "high" | "severe";

export type ServicePressureLevel = "low" | "moderate" | "high";

export type OperationalRiskLevel = "moderate" | "elevated";

export type RoleCapacityRow = {
  roleId: string;
  roleName: string;
  availableHoursMonth: number;
  safeAvailableHoursMonth: number;
  demandedHoursMonth: number;
  utilizationPct: number;
  utilizationBand: UtilizationBand;
  isBottleneck: boolean;
  excessHoursMonth: number;
};

export type ServiceDeliveryPressure = {
  streamId: string;
  streamName: string;
  serviceTemplateId: string | null;
  demandedHours: number;
  shareOfTotalDemandPct: number;
  pressureLevel: ServicePressureLevel;
};

export type StaffingPressure = {
  impliedFteGap: number;
  hiringPressureLevel: HiringPressureLevel;
  deficitHoursMonth: number;
};

export type OperationalSaturation = {
  buUtilizationPct: number;
  safeUtilizationCeilingPct: number;
  overloadRoleCount: number;
  servicesOverCapacityCount: number;
};

export type OperationalRiskIndicator = {
  id: string;
  level: OperationalRiskLevel;
  labelKey: string;
  reasonKey: string;
};

export type FeasibilitySupply = {
  totalBillableHoursMonth: number;
  safeCapacityHoursMonth: number;
  utilizationRatePct: number;
  deliveryHeadcount: number;
};

export type FeasibilityDemand = {
  totalDemandHoursMonth: number;
  revenueScaleFactor: number;
  leverDemandFactor: number;
  salesPlanBlendFactor: number;
};

export type OperationalFeasibilityMeta = {
  companyId: string;
  hrBusinessUnitId: string | null;
  scenarioId: string;
  scenarioName: string;
};

export type OperationalFeasibilityNarrative = {
  headline: string;
  bullets: string[];
  riskBullets: string[];
};

export type OperationalFeasibilityResult = {
  meta: OperationalFeasibilityMeta;
  feasibilityMode: FeasibilityMode;
  unavailableReasonKey?: string;
  status: OperationalFeasibilityStatus;
  supply: FeasibilitySupply | null;
  demand: FeasibilityDemand | null;
  roleRows: RoleCapacityRow[];
  servicePressures: ServiceDeliveryPressure[];
  staffing: StaffingPressure | null;
  saturation: OperationalSaturation | null;
  risks: OperationalRiskIndicator[];
  narrative: OperationalFeasibilityNarrative;
  serviceMixDisclaimer: boolean;
};

export type OperationalFeasibilityStatusDelta = {
  base: OperationalFeasibilityStatus;
  compare: OperationalFeasibilityStatus;
  shifted: boolean;
};

export type OperationalFeasibilityComparison = {
  meta: {
    companyId: string;
    baseScenarioId: string;
    compareScenarioId: string;
    baseName: string;
    compareName: string;
  };
  feasibilityMode: FeasibilityMode;
  base: OperationalFeasibilityResult;
  compare: OperationalFeasibilityResult;
  utilizationDeltaPct: number | null;
  statusDelta: OperationalFeasibilityStatusDelta;
  newBottleneckRoleIds: string[];
  suppressCapacityProxyNarrative: boolean;
};

export type EvaluateOperationalFeasibilityInput = {
  companyId: string;
  companyName: string;
  hrBusinessUnitId: string | null;
  bundleEvaluation: ScenarioBundleEvaluation;
  baselineEvaluation?: ScenarioBundleEvaluation;
  streams: import("@/types/domain").DemoRevenueStream[];
  salesPlanLoadIndex?: number | null;
};

export type CompareOperationalFeasibilityInput = {
  comparison: ScenarioComparisonResult;
  context: CompareScenariosInput;
  hrSnapshot: HrWorkforceSnapshot;
  serviceHoursByTemplateId?: Record<string, number>;
  salesPlanLoadIndex?: number | null;
};

export type OperationalFeasibilityNarrativeLabels = {
  headlineFeasible: (scenario: string) => string;
  headlineConstrained: (scenario: string, pct: string) => string;
  headlineInfeasible: (scenario: string, pct: string) => string;
  roleOverload: (scenario: string, role: string, pct: string) => string;
  serviceBottleneck: (service: string) => string;
  hiringPressure: (fte: string) => string;
  thresholdBreach: (count: string) => string;
  unavailable: (reason: string) => string;
  compareStatusShift: (from: string, to: string) => string;
  disclaimer: string;
  statusLabel: Record<OperationalFeasibilityStatus, string>;
  hiringLevel: Record<HiringPressureLevel, string>;
  riskLabels: Record<string, string>;
};
