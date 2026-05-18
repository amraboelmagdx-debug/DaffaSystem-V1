export { evaluateScenarioBundle, type EvaluateScenarioBundleInput } from "./evaluate-scenario-bundle";
export { compareScenarios, ScenarioComparisonError } from "./compare-scenarios";
export { buildComparisonNarrative } from "./comparison-narrative";
export {
  computeNumericDelta,
  computePostureDelta,
  computeStringDelta,
  computeCapacityPressureProxy,
  SIGNIFICANCE_LOW_PCT,
  SIGNIFICANCE_HIGH_PCT,
} from "./delta-helpers";
