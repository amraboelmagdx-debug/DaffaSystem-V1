import type {
  IncentiveLayer,
  IncentiveLayerMatrixEntry,
  IncentivePayoutDriverType,
  IncentivePlan,
} from "@/types/incentives";
import type { OpportunityTierKey } from "@/types/sales-plan";

const TIER_KEYS: OpportunityTierKey[] = ["tiny", "standard", "big", "mega"];
const DRIVERS: IncentivePayoutDriverType[] = [
  "order_signed",
  "downpayment_cash",
  "collection_received",
];

export function buildDefaultLayerMatrix(plan: IncentivePlan): IncentiveLayerMatrixEntry[] {
  const entries: IncentiveLayerMatrixEntry[] = [];
  for (const layer of plan.layers) {
    if (layer.key === "referrer") continue;
    for (const tierKey of TIER_KEYS) {
      for (const recognitionDriver of DRIVERS) {
        const driverShare =
          recognitionDriver === "order_signed"
            ? 0.5
            : recognitionDriver === "downpayment_cash"
              ? 0.25
              : 0.25;
        entries.push({
          layerId: layer.id,
          tierKey,
          recognitionDriver,
          splitPctOfDealPool: (layer.defaultSplitPct / 100) * driverShare * 100,
        });
      }
    }
  }
  return entries;
}

export function resolveLayerSplitPct(
  plan: IncentivePlan,
  layer: IncentiveLayer,
  tierKey: OpportunityTierKey,
  driver: IncentivePayoutDriverType,
  useMatrix: boolean
): number {
  if (!useMatrix || !plan.layerMatrix?.length) {
    return layer.defaultSplitPct;
  }
  const matches = plan.layerMatrix.filter(
    (e) =>
      e.layerId === layer.id &&
      e.tierKey === tierKey &&
      e.recognitionDriver === driver
  );
  if (!matches.length) return layer.defaultSplitPct;
  return matches.reduce((s, e) => s + e.splitPctOfDealPool, 0);
}

export function sumLayerMatrixForTier(
  plan: IncentivePlan,
  tierKey: OpportunityTierKey
): number {
  if (!plan.layerMatrix?.length) return 0;
  return plan.layerMatrix
    .filter((e) => e.tierKey === tierKey)
    .reduce((s, e) => s + e.splitPctOfDealPool, 0);
}

export function layerPctFromMatrix(
  plan: IncentivePlan,
  layerId: string,
  tierKey: OpportunityTierKey
): number {
  if (!plan.layerMatrix?.length) return 0;
  return plan.layerMatrix
    .filter((e) => e.layerId === layerId && e.tierKey === tierKey)
    .reduce((s, e) => s + e.splitPctOfDealPool, 0);
}

export const ORDER_MATRIX_DRIVERS: IncentivePayoutDriverType[] = [
  "order_signed",
  "downpayment_cash",
];
export const CASH_MATRIX_DRIVER: IncentivePayoutDriverType = "collection_received";

export function getOrderSplitPct(
  plan: IncentivePlan,
  layerId: string,
  tierKey: OpportunityTierKey
): number {
  return ORDER_MATRIX_DRIVERS.reduce(
    (s, d) => s + getCellSplit(plan, layerId, tierKey, d),
    0
  );
}

export function getCashSplitPct(
  plan: IncentivePlan,
  layerId: string,
  tierKey: OpportunityTierKey
): number {
  return getCellSplit(plan, layerId, tierKey, CASH_MATRIX_DRIVER);
}

export function getCellSplit(
  plan: IncentivePlan,
  layerId: string,
  tierKey: OpportunityTierKey,
  driver: IncentivePayoutDriverType
): number {
  return (
    plan.layerMatrix?.find(
      (e) =>
        e.layerId === layerId &&
        e.tierKey === tierKey &&
        e.recognitionDriver === driver
    )?.splitPctOfDealPool ?? 0
  );
}

/** Set Order column; splits 50/50 across order_signed and downpayment_cash. */
export function setOrderSplitPct(
  plan: IncentivePlan,
  layerId: string,
  tierKey: OpportunityTierKey,
  totalPct: number
): IncentiveLayerMatrixEntry[] {
  const half = totalPct / 2;
  const rest = (plan.layerMatrix ?? []).filter(
    (e) =>
      !(
        e.layerId === layerId &&
        e.tierKey === tierKey &&
        ORDER_MATRIX_DRIVERS.includes(e.recognitionDriver)
      )
  );
  return [
    ...rest,
    {
      layerId,
      tierKey,
      recognitionDriver: "order_signed",
      splitPctOfDealPool: half,
    },
    {
      layerId,
      tierKey,
      recognitionDriver: "downpayment_cash",
      splitPctOfDealPool: half,
    },
  ];
}

export function setCashSplitPct(
  plan: IncentivePlan,
  layerId: string,
  tierKey: OpportunityTierKey,
  pct: number
): IncentiveLayerMatrixEntry[] {
  const rest = (plan.layerMatrix ?? []).filter(
    (e) =>
      !(
        e.layerId === layerId &&
        e.tierKey === tierKey &&
        e.recognitionDriver === CASH_MATRIX_DRIVER
      )
  );
  return [
    ...rest,
    {
      layerId,
      tierKey,
      recognitionDriver: CASH_MATRIX_DRIVER,
      splitPctOfDealPool: pct,
    },
  ];
}

export const OPPORTUNITY_TIER_KEYS = TIER_KEYS;
export const MATRIX_DRIVERS = DRIVERS;
