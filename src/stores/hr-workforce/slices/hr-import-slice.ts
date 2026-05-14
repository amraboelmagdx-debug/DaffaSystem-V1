import type { StateCreator } from "zustand";
import type { HrImportLogEntry } from "@/types/hr-workforce";
import type { HrWorkforceState } from "@/stores/hr-workforce/hr-workforce-store-types";
import { newHrId } from "@/lib/hr-workforce/id";
import { buildImportPlan } from "@/lib/hr-workforce/import-dry-run";
import type { ImportPlanResult } from "@/lib/hr-workforce/import-dry-run";
import type { ImportColumnKey, ParsedImportRow } from "@/lib/hr-workforce/import-parser";

/** Initial import workspace (logs persist separately; session is ephemeral). */
export const IMPORT_SESSION_INITIAL = {
  importSessionFileName: "",
  importSessionHeaders: [] as string[],
  importSessionRows: [] as ParsedImportRow[],
  importSessionColumnMap: {} as Partial<Record<ImportColumnKey, string>>,
  importSessionErrors: [] as string[],
  importSessionPlan: null as ImportPlanResult | null,
  importSessionLastDryRunAt: null as string | null,
};

export function getImportSliceResetPayload(): Pick<
  HrWorkforceState,
  | "importLogs"
  | "importSessionFileName"
  | "importSessionHeaders"
  | "importSessionRows"
  | "importSessionColumnMap"
  | "importSessionErrors"
  | "importSessionPlan"
  | "importSessionLastDryRunAt"
> {
  return {
    importLogs: [],
    ...IMPORT_SESSION_INITIAL,
  };
}

export type HrImportSlice = Pick<
  HrWorkforceState,
  | "importLogs"
  | "importSessionFileName"
  | "importSessionHeaders"
  | "importSessionRows"
  | "importSessionColumnMap"
  | "importSessionErrors"
  | "importSessionPlan"
  | "importSessionLastDryRunAt"
  | "pushImportLog"
  | "deleteImportLog"
  | "clearAllImportLogs"
  | "importSessionLoadParsed"
  | "importSessionSetColumnMapping"
  | "importSessionRunDryRun"
  | "importSessionClearAfterSuccessfulCommit"
>;

export const createHrImportSlice: StateCreator<HrWorkforceState, [], [], HrImportSlice> = (set, get, _store) => ({
  importLogs: [],
  ...IMPORT_SESSION_INITIAL,

  pushImportLog: (entry) => {
    const full: HrImportLogEntry = {
      id: entry.id ?? newHrId("log"),
      createdAt: entry.createdAt ?? new Date().toISOString(),
      fileName: entry.fileName,
      rowCount: entry.rowCount,
      status: entry.status,
      message: entry.message,
    };
    set({ importLogs: [full, ...get().importLogs].slice(0, 100) });
  },

  deleteImportLog: (logId) =>
    set({ importLogs: get().importLogs.filter((l) => l.id !== logId) }),

  clearAllImportLogs: () => set({ importLogs: [] }),

  importSessionLoadParsed: ({ fileName, headers, rows, columnMap }) =>
    set({
      importSessionFileName: fileName,
      importSessionHeaders: headers,
      importSessionRows: rows,
      importSessionColumnMap: columnMap,
      importSessionErrors: [],
      importSessionPlan: null,
      importSessionLastDryRunAt: null,
    }),

  importSessionSetColumnMapping: (key, sheetHeader) =>
    set((s) => ({
      importSessionColumnMap: {
        ...s.importSessionColumnMap,
        [key]: sheetHeader,
      },
    })),

  importSessionRunDryRun: () => {
    const s = get();
    const result = buildImportPlan(
      {
        businessUnits: s.businessUnits,
        departments: s.departments,
        teams: s.teams,
        defaultCurrency: s.hrGlobalSettings.defaultCurrency,
      },
      s.importSessionRows,
      s.importSessionColumnMap
    );
    const t = new Date().toISOString();
    if (!result.ok) {
      set({ importSessionErrors: result.errors, importSessionPlan: null, importSessionLastDryRunAt: t });
      return;
    }
    set({
      importSessionErrors: [],
      importSessionPlan: result,
      importSessionLastDryRunAt: t,
    });
  },

  importSessionClearAfterSuccessfulCommit: () =>
    set({
      importSessionFileName: "",
      importSessionHeaders: [],
      importSessionRows: [],
      importSessionColumnMap: {},
      importSessionErrors: [],
      importSessionPlan: null,
      importSessionLastDryRunAt: null,
    }),
});
