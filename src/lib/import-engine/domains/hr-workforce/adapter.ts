import type {
  CommitResult,
  DependencyCheck,
  ImportAdapter,
} from "@/lib/import-engine/types";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import type { HrEngineImportDeltas } from "@/stores/hr-workforce/hr-workforce-store-types";
import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import { writeHrCatalogLocalPersistSnapshot } from "@/lib/persistence/hr-catalog-local-persist";
import { bootstrapOperationalWorkspaceFromHr } from "@/lib/platform-economics/bootstrap-operational-workspace";
import type { HrSnapshot } from "./snapshot";
import { buildHrTemplate } from "./template";
import { planHrUpload } from "./plan";

function loadHrSnapshot(): HrSnapshot {
  const s = useHrWorkforceStore.getState();
  return {
    businessUnits: s.businessUnits,
    departments: s.departments,
    teams: s.teams,
    roles: s.roles,
    globalSettings: s.hrGlobalSettings,
    ohManualByBusinessUnitId: s.ohManualByBusinessUnitId,
  };
}

function checkHrDependencies(): DependencyCheck[] {
  const s = useHrWorkforceStore.getState();
  return [
    {
      moduleId: "tenant",
      label: "Organization workspace",
      status: s.businessUnits.length > 0 ? "satisfied" : "missing",
      detail:
        s.businessUnits.length > 0
          ? `${s.businessUnits.length} business unit(s) ready to import against.`
          : "Create at least one business unit (or use the default Main) before importing.",
    },
  ];
}

async function commitHr(
  deltas: HrEngineImportDeltas,
  context: { organizationId: string | null }
): Promise<CommitResult> {
  const state = useHrWorkforceStore.getState();
  state.applyEngineImportDeltas(deltas, { replace: false });

  const summary = [
    {
      entity: "Business Units",
      inserts: deltas.businessUnits.filter((u) => !state.businessUnits.some((e) => e.id === u.id))
        .length,
      updates: deltas.businessUnits.length,
    },
    {
      entity: "Departments",
      inserts: deltas.departments.filter((d) => !state.departments.some((e) => e.id === d.id)).length,
      updates: deltas.departments.length,
    },
    {
      entity: "Teams",
      inserts: deltas.teams.filter((t) => !state.teams.some((e) => e.id === t.id)).length,
      updates: deltas.teams.length,
    },
    {
      entity: "Roles",
      inserts: deltas.roles.filter((r) => !state.roles.some((e) => e.id === r.id)).length,
      updates: deltas.roles.length,
    },
  ];

  state.pushImportLog({
    fileName: "import-engine",
    rowCount: deltas.roles.length,
    status: "success",
    message: `HR engine import: ${deltas.roles.length} role rows`,
  });

  const orgId = context.organizationId;
  if (orgId) {
    writeHrCatalogLocalPersistSnapshot(orgId, new Date().toISOString());
    try {
      await flushHrCatalogSync(orgId, { skipExpectedUpdatedAt: true });
    } catch {
      /* sync retries are surfaced through the persist bar */
    }
    try {
      await bootstrapOperationalWorkspaceFromHr(orgId);
    } catch {
      /* operational workspace is rebuilt on next navigation */
    }
  }

  return { ok: true, appliedSummary: summary };
}

export const hrWorkforceImportAdapter: ImportAdapter<HrSnapshot, HrEngineImportDeltas> = {
  id: "hr-workforce",
  label: "HR Workforce",
  dependsOn: [],
  loadSnapshot: loadHrSnapshot,
  checkDependencies: checkHrDependencies,
  buildTemplate: buildHrTemplate,
  planUpload: (workbook, snapshot) => planHrUpload(workbook, snapshot),
  commit: commitHr,
};
