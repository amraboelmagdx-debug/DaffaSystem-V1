import type { ServiceCostAssumptions } from "./types";

export const DEFAULT_SERVICE_COST_ASSUMPTIONS: ServiceCostAssumptions = {
  deliveryInefficiencyFactor: 1,
  qaSensitivityFactor: 1,
  designRevisionIntensityFactor: 1,
  coordinationLoadFactor: 1,
  managementLoadFactor: 1,
  clientReviewLagFactor: 1,
  implicitWrapLoadedCostFraction: 0,
};
