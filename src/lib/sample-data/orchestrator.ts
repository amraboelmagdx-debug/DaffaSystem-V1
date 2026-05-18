import { getSampleDataModule, SAMPLE_DATA_MODULES } from "./registry";
import type { SampleDataAction, SampleDataModuleId, SampleDataResult } from "./types";

export async function runSampleDataAction(
  moduleId: SampleDataModuleId,
  action: SampleDataAction
): Promise<SampleDataResult> {
  const mod = getSampleDataModule(moduleId);
  if (!mod) {
    return { ok: false, moduleId, action, reason: "unknown_module" };
  }
  const fn =
    action === "load" ? mod.load : action === "clear" ? mod.clear : mod.reset;
  return await Promise.resolve(fn());
}

/** Load all modules in dependency order (HR → SA → workspace → wizard → prefs). */
export async function loadAllSampleData(): Promise<SampleDataResult[]> {
  const order: SampleDataModuleId[] = [
    "hr-workforce",
    "service-architecture",
    "workspace",
    "sales-plan-wizard",
    "commercial-pricing-prefs",
    "service-cost-simulation-prefs",
    "incentives-default-v1",
  ];
  const results: SampleDataResult[] = [];
  for (const id of order) {
    results.push(await runSampleDataAction(id, "load"));
  }
  return results;
}

export async function clearAllSampleData(): Promise<SampleDataResult[]> {
  const order: SampleDataModuleId[] = [
    "service-architecture",
    "sales-plan-wizard",
    "workspace",
    "hr-workforce",
    "commercial-pricing-prefs",
    "service-cost-simulation-prefs",
    "incentives-default-v1",
  ];
  const results: SampleDataResult[] = [];
  for (const id of order) {
    results.push(await runSampleDataAction(id, "clear"));
  }
  return results;
}

export { SAMPLE_DATA_MODULES };
