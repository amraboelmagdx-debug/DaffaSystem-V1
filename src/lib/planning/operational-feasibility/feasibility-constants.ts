/** Safe delivery utilization ceiling for overload detection (distinct from OH target). */
export const SAFE_UTILIZATION_PCT = 85;

/** BU demand/supply ratio below this → feasible. */
export const FEASIBLE_RATIO_THRESHOLD = 0.85;

/** At or above 1.0 → infeasible; between feasible and 1.0 → constrained. */
export const INFEASIBLE_RATIO_THRESHOLD = 1.0;

/** Standard monthly hours per FTE for hiring gap (matches calendar formula at 5×8×52/12). */
export const STANDARD_FTE_HOURS_MONTH = (5 * 8 * 52) / 12;

/** Weight for optional sales plan load index blend into demand scalar. */
export const SALES_PLAN_DEMAND_BLEND_WEIGHT = 0.3;

/** Service demand share exceeding proportional supply by this fraction → high pressure. */
export const SERVICE_OVERCAPACITY_SHARE_THRESHOLD = 0.15;

export const EPS = 1e-9;
