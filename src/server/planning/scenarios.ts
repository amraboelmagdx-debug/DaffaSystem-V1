import { createRouteSupabaseClient } from "@/lib/supabase/route-handler";
import type { ScenarioBundleAssumptionsPayload } from "@/types/planning-scenario";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateScenarioInput = {
  companyId: string;
  name: string;
  isBaseline?: boolean;
  parentScenarioId?: string | null;
  version?: number;
  assumptions: ScenarioBundleAssumptionsPayload;
  clientId?: string;
};

export type UpdateScenarioInput = {
  name?: string;
  isBaseline?: boolean;
  parentScenarioId?: string | null;
  version?: number;
  assumptions: ScenarioBundleAssumptionsPayload;
  recordSnapshot?: boolean;
};

export async function createPlanningScenario(input: CreateScenarioInput) {
  const supabase = await createRouteSupabaseClient();
  if (!supabase) return { error: "Supabase not configured" as const };

  const row: Record<string, unknown> = {
    company_id: input.companyId,
    name: input.name,
    is_baseline: input.isBaseline ?? false,
    parent_scenario_id: input.parentScenarioId ?? null,
    version: input.version ?? 1,
    assumptions: input.assumptions,
  };
  if (input.clientId && UUID_RE.test(input.clientId)) {
    row.id = input.clientId;
  }

  const { data, error } = await supabase.from("scenarios").insert(row).select("id").single();
  if (error) return { error: error.message };
  return { id: String(data.id) };
}

export async function updatePlanningScenario(scenarioId: string, input: UpdateScenarioInput) {
  const supabase = await createRouteSupabaseClient();
  if (!supabase) return { error: "Supabase not configured" as const };

  const nextVersion = input.version ?? input.assumptions.version ?? 1;
  const patch: Record<string, unknown> = {
    assumptions: input.assumptions,
    version: nextVersion,
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.isBaseline !== undefined) patch.is_baseline = input.isBaseline;
  if (input.parentScenarioId !== undefined) patch.parent_scenario_id = input.parentScenarioId;

  const { error } = await supabase.from("scenarios").update(patch).eq("id", scenarioId);
  if (error) return { error: error.message };

  if (input.recordSnapshot) {
    await supabase.from("scenario_snapshots").insert({
      scenario_id: scenarioId,
      label: `v${nextVersion}`,
      snapshot: input.assumptions,
    });
  }

  return { ok: true as const };
}
