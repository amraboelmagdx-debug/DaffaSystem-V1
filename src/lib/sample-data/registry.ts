import {
  clearCommercialPricingPrefsSample,
  clearServiceCostSimulationPrefsSample,
  loadCommercialPricingPrefsSample,
  loadServiceCostSimulationPrefsSample,
  resetCommercialPricingPrefsSample,
  resetServiceCostSimulationPrefsSample,
} from "./modules/prefs";
import {
  clearHrWorkforceSample,
  loadHrWorkforceSample,
  resetHrWorkforceSample,
} from "./modules/hr-workforce";
import {
  clearServiceArchitectureSample,
  loadServiceArchitectureSample,
  resetServiceArchitectureSample,
} from "./modules/service-architecture";
import {
  clearSalesPlanWizardSample,
  loadSalesPlanWizardSample,
  resetSalesPlanWizardSample,
} from "./modules/sales-plan-wizard";
import {
  clearWorkspaceSample,
  loadWorkspaceSample,
  resetWorkspaceSample,
} from "./modules/workspace";
import type { SampleDataModuleDefinition, SampleDataModuleId } from "./types";

export const SAMPLE_DATA_MODULES: SampleDataModuleDefinition[] = [
  {
    id: "hr-workforce",
    labelKey: "hrWorkforce",
    descriptionKey: "hrWorkforceDesc",
    load: loadHrWorkforceSample,
    clear: clearHrWorkforceSample,
    reset: resetHrWorkforceSample,
  },
  {
    id: "service-architecture",
    labelKey: "serviceArchitecture",
    descriptionKey: "serviceArchitectureDesc",
    requiresHrRoles: true,
    load: loadServiceArchitectureSample,
    clear: clearServiceArchitectureSample,
    reset: resetServiceArchitectureSample,
  },
  {
    id: "workspace",
    labelKey: "workspace",
    descriptionKey: "workspaceDesc",
    load: loadWorkspaceSample,
    clear: clearWorkspaceSample,
    reset: resetWorkspaceSample,
  },
  {
    id: "sales-plan-wizard",
    labelKey: "salesPlanWizard",
    descriptionKey: "salesPlanWizardDesc",
    load: loadSalesPlanWizardSample,
    clear: clearSalesPlanWizardSample,
    reset: resetSalesPlanWizardSample,
  },
  {
    id: "commercial-pricing-prefs",
    labelKey: "commercialPricingPrefs",
    descriptionKey: "commercialPricingPrefsDesc",
    load: loadCommercialPricingPrefsSample,
    clear: clearCommercialPricingPrefsSample,
    reset: resetCommercialPricingPrefsSample,
  },
  {
    id: "service-cost-simulation-prefs",
    labelKey: "serviceCostSimulationPrefs",
    descriptionKey: "serviceCostSimulationPrefsDesc",
    load: loadServiceCostSimulationPrefsSample,
    clear: clearServiceCostSimulationPrefsSample,
    reset: resetServiceCostSimulationPrefsSample,
  },
];

export function getSampleDataModule(id: SampleDataModuleId): SampleDataModuleDefinition | undefined {
  return SAMPLE_DATA_MODULES.find((m) => m.id === id);
}
