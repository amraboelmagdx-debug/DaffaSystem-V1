/**
 * Import-ready entity shapes (Excel / CSV future).
 * Mirrors server catalog slices without UI coupling.
 */

export type ImportableHrRole = {
  externalId?: string;
  name: string;
  businessUnitCode?: string;
  departmentName?: string;
  teamName?: string | null;
  employmentType: string;
  employeeCount: number;
  currency: string;
  avgMonthlySalary: number;
  avgMonthlySocialInsurance?: number;
  annualMedicalInsurance?: number;
  annualEndOfServiceCost?: number;
  riskFactorPct?: number;
  isBillable?: boolean;
  includeInOhAllocation?: boolean;
};

export type ImportableHrCatalog = {
  packVersion: number;
  businessUnits: Array<{ code: string; name: string }>;
  departments: Array<{ code?: string; name: string; businessUnitCode: string }>;
  teams: Array<{ name: string; departmentName: string; businessUnitCode: string }>;
  roles: ImportableHrRole[];
};

export type ImportableWorkspaceRow = {
  companyName: string;
  streamName: string;
  revenueWeight?: number;
  contributionMarginPct?: number;
};

/** Normalization hooks for future import pipeline. */
export type ImportValidationIssue = {
  path: string;
  message: string;
  severity: "error" | "warning";
};
