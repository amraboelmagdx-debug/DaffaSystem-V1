/** Shared discriminant for which engine owns a measure’s primary formula. */

export type FormulaOwner =
  | "calculations-engine"
  | "workbook-engine"
  | "pipeline"
  | "sales-plan-build-model"
  | "derived";
