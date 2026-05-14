import type { ServiceCostScenarioModifiers } from "./types";

export const SERVICE_COST_SCENARIO_PRESETS: ServiceCostScenarioModifiers[] = [
  {
    id: "baseline",
    label: "Baseline",
    description: "No scenario stress — uses catalog hours with assumptions only.",
    hoursMultiplier: 1,
    effortMultiplier: 1,
    coordinationMultiplier: 1,
    managementMultiplier: 1,
  },
  {
    id: "aggressive_client",
    label: "Aggressive client",
    description: "More review cycles and coordination load.",
    hoursMultiplier: 1.08,
    effortMultiplier: 1.12,
    coordinationMultiplier: 1.25,
    managementMultiplier: 1.1,
  },
  {
    id: "compressed_timeline",
    label: "Compressed timeline",
    description: "Same scope with calendar pressure — effort intensity rises.",
    hoursMultiplier: 1,
    effortMultiplier: 1.22,
    coordinationMultiplier: 1.15,
    managementMultiplier: 1.08,
  },
  {
    id: "premium_quality",
    label: "Premium quality bar",
    description: "Extra polish and QA sensitivity.",
    hoursMultiplier: 1.05,
    effortMultiplier: 1.18,
    coordinationMultiplier: 1.05,
    managementMultiplier: 1.12,
  },
  {
    id: "complex_stakeholders",
    label: "Complex stakeholders",
    description: "Large decision surface — coordination and management load.",
    hoursMultiplier: 1.02,
    effortMultiplier: 1.05,
    coordinationMultiplier: 1.35,
    managementMultiplier: 1.2,
  },
  {
    id: "multilingual",
    label: "Multilingual delivery",
    description: "Localization overhead on effort.",
    hoursMultiplier: 1.12,
    effortMultiplier: 1.1,
    coordinationMultiplier: 1.08,
    managementMultiplier: 1.05,
  },
  {
    id: "high_qa_sensitivity",
    label: "High QA sensitivity",
    description: "Regulated or brand-critical QA path.",
    hoursMultiplier: 1.04,
    effortMultiplier: 1.06,
    coordinationMultiplier: 1.06,
    managementMultiplier: 1.04,
  },
];

export function getScenarioPresetById(id: string): ServiceCostScenarioModifiers {
  return SERVICE_COST_SCENARIO_PRESETS.find((s) => s.id === id) ?? SERVICE_COST_SCENARIO_PRESETS[0];
}
