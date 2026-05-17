/** Modules that support unified sample load / clear / reset. */
export type SampleDataModuleId =
  | "hr-workforce"
  | "service-architecture"
  | "workspace"
  | "sales-plan-wizard"
  | "commercial-pricing-prefs"
  | "service-cost-simulation-prefs";

export type SampleDataAction = "load" | "clear" | "reset";

export type SampleDataResult = {
  ok: boolean;
  moduleId: SampleDataModuleId;
  action: SampleDataAction;
  message?: string;
  reason?: string;
};

export type SampleDataModuleDefinition = {
  id: SampleDataModuleId;
  /** i18n key under sampleData.modules.{labelKey} */
  labelKey: string;
  descriptionKey: string;
  requiresHrRoles?: boolean;
  load: () => Promise<SampleDataResult> | SampleDataResult;
  clear: () => Promise<SampleDataResult> | SampleDataResult;
  reset: () => Promise<SampleDataResult> | SampleDataResult;
};

export const SAMPLE_PACK_ID = "efp-default-v1";
export const SAMPLE_PACK_VERSION = 1;
