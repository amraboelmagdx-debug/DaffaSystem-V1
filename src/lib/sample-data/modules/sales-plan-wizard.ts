import { demoStreams } from "@/data/demo-seed";
import { useSalesPlanWizardStore } from "@/stores/use-sales-plan-wizard-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { SampleDataResult } from "../types";
import { SAMPLE_PACK_ID } from "../types";

function ok(action: SampleDataResult["action"], message?: string): SampleDataResult {
  return { ok: true, moduleId: "sales-plan-wizard", action, message };
}

function fail(action: SampleDataResult["action"], reason: string): SampleDataResult {
  return { ok: false, moduleId: "sales-plan-wizard", action, reason };
}

function streamRowsForSeed() {
  const ws = useWorkspaceStore.getState();
  const rows =
    ws.streams.length > 0
      ? ws.streams.map((s) => ({ id: s.id, name: s.name }))
      : demoStreams.map((s) => ({ id: s.id, name: s.name }));
  return rows;
}

export function clearSalesPlanWizardSample(): SampleDataResult {
  useSalesPlanWizardStore.getState().resetWizard();
  return ok("clear", "Sales plan wizard cleared");
}

export function loadSalesPlanWizardSample(): SampleDataResult {
  const wizard = useSalesPlanWizardStore.getState();
  wizard.resetWizard();
  const rows = streamRowsForSeed();
  if (!rows.length) return fail("load", "no_streams");
  wizard.seedProductsFromStreams(rows);
  return ok("load", `${SAMPLE_PACK_ID}: wizard seeded from streams`);
}

export function resetSalesPlanWizardSample(): SampleDataResult {
  return loadSalesPlanWizardSample();
}
