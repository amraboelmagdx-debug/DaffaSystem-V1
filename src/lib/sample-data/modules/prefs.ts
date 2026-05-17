import { useCommercialPricingPrefsStore } from "@/stores/use-commercial-pricing-prefs-store";
import { useServiceCostSimulationPrefsStore } from "@/stores/use-service-cost-simulation-prefs-store";
import type { SampleDataResult } from "../types";

function commercialOk(action: SampleDataResult["action"]): SampleDataResult {
  return { ok: true, moduleId: "commercial-pricing-prefs", action };
}

function costSimOk(action: SampleDataResult["action"]): SampleDataResult {
  return { ok: true, moduleId: "service-cost-simulation-prefs", action };
}

export function clearCommercialPricingPrefsSample(): SampleDataResult {
  useCommercialPricingPrefsStore.getState().reset();
  return commercialOk("clear");
}

export function loadCommercialPricingPrefsSample(): SampleDataResult {
  useCommercialPricingPrefsStore.getState().reset();
  return commercialOk("load");
}

export function resetCommercialPricingPrefsSample(): SampleDataResult {
  return loadCommercialPricingPrefsSample();
}

export function clearServiceCostSimulationPrefsSample(): SampleDataResult {
  const s = useServiceCostSimulationPrefsStore.getState();
  s.resetAssumptions();
  s.setScenarioId("baseline");
  return costSimOk("clear");
}

export function loadServiceCostSimulationPrefsSample(): SampleDataResult {
  return clearServiceCostSimulationPrefsSample();
}

export function resetServiceCostSimulationPrefsSample(): SampleDataResult {
  return loadServiceCostSimulationPrefsSample();
}
