import { registerImportAdapter } from "./registry";
import { hrWorkforceImportAdapter } from "./domains/hr-workforce";
import { serviceArchitectureImportAdapter } from "./domains/service-architecture";
import { salesPlanImportAdapter } from "./domains/sales-plan";
import { incentivesImportAdapter } from "./domains/incentives";

let registered = false;

/** Idempotent registration of all built-in import adapters. */
export function ensureImportAdaptersRegistered(): void {
  if (registered) return;
  registered = true;
  registerImportAdapter(hrWorkforceImportAdapter as never);
  registerImportAdapter(serviceArchitectureImportAdapter as never);
  registerImportAdapter(salesPlanImportAdapter as never);
  registerImportAdapter(incentivesImportAdapter as never);
}
