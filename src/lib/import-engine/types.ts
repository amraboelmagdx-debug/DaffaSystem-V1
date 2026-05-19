/** Parsed cell row from any worksheet. */
export interface ParsedRow {
  rowIndex: number;
  values: Record<string, string>;
}

/** Parsed worksheet — headers + body rows. */
export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: ParsedRow[];
}

/** Multi-sheet parsed workbook. */
export interface ParsedWorkbook {
  sheets: ParsedSheet[];
}

export type IssueLevel = "error" | "warning" | "info";

/** Validation issue surfaced during dry-run. */
export interface ImportIssue {
  level: IssueLevel;
  sheet?: string;
  rowIndex?: number;
  field?: string;
  message: string;
  code?: string;
}

/** One row in the change summary table shown to the user. */
export interface ImportChangeSummaryRow {
  entity: string;
  inserts: number;
  updates: number;
  skipped?: number;
  notes?: string;
}

/** Dry-run plan result emitted by a domain adapter. */
export interface ImportPlanResult<TDeltas> {
  ok: boolean;
  issues: ImportIssue[];
  changeSummary: ImportChangeSummaryRow[];
  deltas?: TDeltas;
}

export type DependencyStatus = "satisfied" | "missing" | "partial";

export interface DependencyCheck {
  moduleId: string;
  label: string;
  status: DependencyStatus;
  detail?: string;
}

/** Sheet column descriptor for template generation. */
export interface ColumnSpec {
  key: string;
  label: string;
  required?: boolean;
  example?: string | number;
  /** When set, renders as dropdown via reference sheet validation hint. */
  enumValues?: string[];
  help?: string;
}

/** Worksheet specification (data sheet). */
export interface SheetSpec {
  name: string;
  description?: string;
  columns: ColumnSpec[];
  /** Optional pre-filled rows (used in “export current state” mode). */
  rows?: Array<Record<string, string | number | boolean | null>>;
}

/** Read-only reference sheet (existing data dump for lookups). */
export interface ReferenceSheetSpec {
  name: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null>>;
  description?: string;
}

export interface TemplateSpec {
  fileName: string;
  instructions: {
    title: string;
    lines: string[];
  };
  referenceSheets?: ReferenceSheetSpec[];
  sheets: SheetSpec[];
  validationNotes?: string[];
}

/** Generic context delivered to adapters. */
export interface ImportContext {
  organizationId: string | null;
  organizationName: string | null;
  /** Module-specific “current state” snapshot (for upsert + reference sheets). */
  snapshot: unknown;
}

export interface CommitResult {
  ok: boolean;
  error?: string;
  appliedSummary?: ImportChangeSummaryRow[];
}

/** Domain adapter contract. */
export interface ImportAdapter<TSnapshot, TDeltas> {
  id: string;
  label: string;
  dependsOn: string[];
  /** Read current state for template + dry-run. */
  loadSnapshot: () => TSnapshot;
  /** Dependency satisfaction check. */
  checkDependencies: () => DependencyCheck[];
  /** Build the Excel template spec, optionally seeded with current data (mode === "export"). */
  buildTemplate: (snapshot: TSnapshot, mode: "blank" | "export") => TemplateSpec;
  /** Parse uploaded workbook into a plan. */
  planUpload: (
    workbook: import("./types").ParsedWorkbook,
    snapshot: TSnapshot,
    context: ImportContext
  ) => ImportPlanResult<TDeltas>;
  /** Commit the deltas (writes through existing store/sync chains). */
  commit: (deltas: TDeltas, context: ImportContext) => Promise<CommitResult>;
}
