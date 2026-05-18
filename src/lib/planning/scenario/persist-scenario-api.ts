import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import { recordScenarioPersistError } from "@/lib/persistence/platform-persistence-debug";
import { bundleAssumptionsFromBundle } from "./scenario-bundle";

export type ScenarioPersistResult =
  | { ok: true }
  | { ok: false; status?: number; message: string };

export async function persistScenarioBundleToServer(
  bundle: ScenarioPlanningBundle,
  mode: "create" | "update"
): Promise<ScenarioPersistResult> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Not in browser context" };
  }

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
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        recordScenarioPersistError({ message: msg, status: res.status, scenarioId: bundle.scenario.id });
        return { ok: false, status: res.status, message: msg };
      }
      recordScenarioPersistError(null);
      return { ok: true };
    }

    const res = await fetch(`/api/planning/scenarios/${encodeURIComponent(bundle.scenario.id)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await readErrorMessage(res);
      recordScenarioPersistError({ message: msg, status: res.status, scenarioId: bundle.scenario.id });
      return { ok: false, status: res.status, message: msg };
    }
    recordScenarioPersistError(null);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scenario persist failed (offline)";
    recordScenarioPersistError({ message, scenarioId: bundle.scenario.id });
    return { ok: false, message };
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (typeof body.error === "string") return body.error;
  } catch {
    /* ignore */
  }
  return `Scenario persist failed (${res.status})`;
}
