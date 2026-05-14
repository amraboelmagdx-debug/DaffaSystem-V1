import type { ServiceCostAssumptions } from "./types";
import { DEFAULT_SERVICE_COST_ASSUMPTIONS } from "./defaults";

export type ServiceCostAssumptionImportKey = keyof ServiceCostAssumptions;

export interface ServiceCostAssumptionImportRow {
  assumptionKey: string;
  numericValue: string;
}

export interface ServiceCostAssumptionImportIssue {
  rowIndex: number;
  field: keyof ServiceCostAssumptionImportRow | "row";
  message: string;
}

const ALLOWED_KEYS = new Set<string>(Object.keys(DEFAULT_SERVICE_COST_ASSUMPTIONS));

/**
 * Preview-first import for assumption numeric overrides (e.g. future CSV / Excel column).
 * Returns merged assumptions; does not mutate defaults.
 */
export function buildServiceCostAssumptionImportPreview(rows: ServiceCostAssumptionImportRow[]): {
  valid: boolean;
  issues: ServiceCostAssumptionImportIssue[];
  mergedAssumptions: ServiceCostAssumptions;
} {
  const issues: ServiceCostAssumptionImportIssue[] = [];
  const merged: ServiceCostAssumptions = { ...DEFAULT_SERVICE_COST_ASSUMPTIONS };

  rows.forEach((raw, idx) => {
    const rowIndex = idx + 1;
    const assumptionKey = (raw.assumptionKey ?? "").trim();
    const numericValue = (raw.numericValue ?? "").trim();
    if (!assumptionKey) {
      issues.push({ rowIndex, field: "assumptionKey", message: "assumptionKey is required" });
      return;
    }
    if (!ALLOWED_KEYS.has(assumptionKey)) {
      issues.push({ rowIndex, field: "assumptionKey", message: `Unknown assumption key: ${assumptionKey}` });
      return;
    }
    if (!numericValue) {
      issues.push({ rowIndex, field: "numericValue", message: "numericValue is required" });
      return;
    }
    const n = Number(numericValue);
    if (!Number.isFinite(n)) {
      issues.push({ rowIndex, field: "numericValue", message: "numericValue must be a finite number" });
      return;
    }
    if (n < 0 && assumptionKey !== "implicitWrapLoadedCostFraction") {
      issues.push({ rowIndex, field: "numericValue", message: "Negative values not allowed for this key" });
      return;
    }
    if (assumptionKey === "implicitWrapLoadedCostFraction" && (n < 0 || n > 1)) {
      issues.push({ rowIndex, field: "numericValue", message: "implicitWrapLoadedCostFraction must be between 0 and 1" });
      return;
    }
    (merged as unknown as Record<string, number>)[assumptionKey] = n;
  });

  return {
    valid: issues.length === 0,
    issues,
    mergedAssumptions: merged,
  };
}

export function exportAssumptionsToImportRows(assumptions: ServiceCostAssumptions): ServiceCostAssumptionImportRow[] {
  return (Object.keys(DEFAULT_SERVICE_COST_ASSUMPTIONS) as ServiceCostAssumptionImportKey[]).map((key) => ({
    assumptionKey: key,
    numericValue: String(assumptions[key]),
  }));
}
