import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import { bundleAssumptionsFromBundle } from "./scenario-bundle";

export async function persistScenarioBundleToServer(
  bundle: ScenarioPlanningBundle,
  mode: "create" | "update"
): Promise<void> {
  if (typeof window === "undefined") return;

  const assumptions = bundleAssumptionsFromBundle(bundle);
  const body = {
    companyId: bundle.scenario.companyId,
    name: bundle.scenario.name,
    isBaseline: bundle.scenario.baseline,
    parentScenarioId: bundle.parentScenarioId,
    version: bundle.version,
    assumptions,
    clientId: bundle.scenario.id,
  };

  try {
  if (mode === "create") {
    const res = await fetch("/api/planning/scenarios", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    return;
  }

  await fetch(`/api/planning/scenarios/${encodeURIComponent(bundle.scenario.id)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  } catch {
    /* offline / test */
  }
}
