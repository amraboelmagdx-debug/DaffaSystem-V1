/** Shared discriminant for which engine owns a measure’s primary formula. */

export type FormulaOwner =
  | "calculations-engine"
  | "workbook-engine"
  | "pipeline"
  | "sales-plan-build-model"
  | "service-economics"
  | "deal-economics"
  | "derived";
