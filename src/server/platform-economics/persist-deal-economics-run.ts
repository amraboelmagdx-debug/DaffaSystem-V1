import { toDealEconomicsRunRecord, type PersistDealEconomicsRunInput } from "@/lib/deal-economics/persist-run";
import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";

export type PersistDealEconomicsRunResult =
  | { ok: true; run: ReturnType<typeof toDealEconomicsRunRecord> }
  | { ok: false; status: number; message: string };

export async function persistDealEconomicsRun(
  payload: PersistDealEconomicsRunInput
): Promise<PersistDealEconomicsRunResult> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 503, message: "Supabase client is not configured" };
  }

  const record = toDealEconomicsRunRecord(crypto.randomUUID(), payload);

  const { error } = await supabase.from("deal_economics_runs").insert({
    id: record.id,
    organization_id: record.organizationId,
    hr_business_unit_id: record.hrBusinessUnitId,
    input_json: record.inputJson,
    result_json: record.resultJson,
    engine_version: record.engineVersion,
    contract_version: record.contractVersion,
    created_at: record.createdAt,
  });

  if (error) {
    return { ok: false, status: 500, message: error.message };
  }

  return { ok: true, run: record };
}
