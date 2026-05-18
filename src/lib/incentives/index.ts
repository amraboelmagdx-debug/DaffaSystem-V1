export { evaluateIncentiveRun } from "./evaluate-incentive-run";
export { validateIncentivePlan } from "./validate-plan";
export { matchIncentiveRule } from "./match-rule";
export { createDefaultIncentivePlan } from "./default-plan";
export {
  ingestIncentiveFacts,
  createIncentiveFactsStore,
  type IncentiveFactsStore,
} from "./incentive-facts-ingest";
export {
  demoOpportunityToIncentiveDeal,
  participantsFromHrRoles,
} from "./opportunity-bridge";
export { participantsFromPlan } from "./participants-from-plan";
export { incentiveDealFromValues } from "./opportunity-bridge";
export { buildDefaultLayerMatrix, layerPctFromMatrix } from "./plan-matrix";
export { scorecardAttainmentFromSalesPlan } from "./scorecard-bridge";
export { generateSyntheticDeals } from "./generate-synthetic-deals";
export { dealsFromFactBatch, applyCashEventsToDeals } from "./fact-to-deal-projector";
export { splitAmongParticipants } from "./allocate-participants";
export { deriveEvaluateOptionsFromPlan } from "./plan-options";
export { evaluateOperationalWarnings } from "./operational-warnings";
export {
  dealsFromForwardForecast,
  scorecardAttainmentFromEconomicsMeasures,
} from "./forecast-bridge";
export { buildDedupeKey } from "./persist-plan";
