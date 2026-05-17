import {
  demoCompanies,
  demoOpportunities,
  demoScenarios,
  demoStreams,
} from "@/data/demo-seed";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { SampleDataResult } from "../types";
import { SAMPLE_PACK_ID } from "../types";

function ok(action: SampleDataResult["action"], message?: string): SampleDataResult {
  return { ok: true, moduleId: "workspace", action, message };
}

export function clearWorkspaceSample(): SampleDataResult {
  useWorkspaceStore.getState().resetToEmpty();
  return ok("clear", "Planning workspace cleared");
}

export function loadWorkspaceSample(): SampleDataResult {
  useWorkspaceStore.getState().loadDemoPack();
  return ok("load", `${SAMPLE_PACK_ID}: executive workspace demo loaded`);
}

export function resetWorkspaceSample(): SampleDataResult {
  return loadWorkspaceSample();
}

/** Initial demo pack snapshot (deterministic ids from demo-seed). */
export function getWorkspaceDemoSnapshot() {
  return {
    companies: demoCompanies.map((c) => ({ ...c })),
    opportunities: demoOpportunities.map((o) => ({ ...o })),
    streams: demoStreams.map((s) => ({ ...s })),
    scenarios: demoScenarios.map((s) => ({ ...s })),
    selectedCompanyId: demoCompanies[0]?.id ?? "",
    selectedScenarioId: demoScenarios[0]?.id ?? "",
  };
}
