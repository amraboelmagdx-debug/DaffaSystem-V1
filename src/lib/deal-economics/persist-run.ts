import type { DealEconomicsInput, DealEconomicsResultSuccess, DealEconomicsRunRecord } from "./types";
import { DEAL_ECONOMICS_CONTRACT_VERSION, DEAL_ECONOMICS_ENGINE_VERSION } from "./types";

export type PersistDealEconomicsRunInput = {
  organizationId: string;
  hrBusinessUnitId: string;
  input: DealEconomicsInput;
  result: DealEconomicsResultSuccess;
};

export function toDealEconomicsRunRecord(
  id: string,
  payload: PersistDealEconomicsRunInput,
  createdAt = new Date().toISOString()
): DealEconomicsRunRecord {
  return {
    id,
    organizationId: payload.organizationId,
    hrBusinessUnitId: payload.hrBusinessUnitId,
    inputJson: payload.input,
    resultJson: payload.result,
    engineVersion: DEAL_ECONOMICS_ENGINE_VERSION,
    contractVersion: DEAL_ECONOMICS_CONTRACT_VERSION,
    createdAt,
  };
}
