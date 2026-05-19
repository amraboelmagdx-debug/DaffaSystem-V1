import { ciKey } from "./normalize";
import type { ImportIssue, ParsedSheet } from "./types";

/** Build a name→id lookup map from a reference list. */
export function makeNameIndex<T extends { id: string; name: string }>(
  items: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const it of items) {
    if (!it.name) continue;
    map.set(ciKey(it.name), it);
  }
  return map;
}

/** Build a code→item lookup (case-insensitive). Items without a code are skipped. */
export function makeCodeIndex<T extends { id: string; code?: string | null }>(
  items: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const it of items) {
    const c = (it.code ?? "").trim();
    if (!c) continue;
    map.set(ciKey(c), it);
  }
  return map;
}

/** Build an id→item lookup. */
export function makeIdIndex<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((it) => [it.id, it]));
}

/** Resolve a foreign reference (id preferred, then code, then name). Returns the target entity or null. */
export function resolveRef<T extends { id: string; name?: string; code?: string | null }>(
  raw: { id?: string; code?: string; name?: string },
  indices: { byId?: Map<string, T>; byCode?: Map<string, T>; byName?: Map<string, T> }
): T | null {
  if (raw.id && indices.byId?.has(raw.id)) return indices.byId.get(raw.id) ?? null;
  if (raw.code && indices.byCode?.has(ciKey(raw.code))) {
    return indices.byCode.get(ciKey(raw.code)) ?? null;
  }
  if (raw.name && indices.byName?.has(ciKey(raw.name))) {
    return indices.byName.get(ciKey(raw.name)) ?? null;
  }
  return null;
}

/** Detect duplicate keys in a sheet — same key value seen twice. */
export function detectDuplicates(
  sheet: ParsedSheet,
  keyFn: (row: Record<string, string>) => string | null
): ImportIssue[] {
  const seen = new Map<string, number>();
  const issues: ImportIssue[] = [];
  for (const row of sheet.rows) {
    const k = keyFn(row.values);
    if (!k) continue;
    if (seen.has(k)) {
      issues.push({
        level: "error",
        sheet: sheet.name,
        rowIndex: row.rowIndex,
        message: `Duplicate entry "${k}" (also at row ${seen.get(k)}).`,
        code: "duplicate",
      });
    } else {
      seen.set(k, row.rowIndex);
    }
  }
  return issues;
}

/** Compose a single ImportIssue helper. */
export function issue(
  level: ImportIssue["level"],
  message: string,
  ctx: Partial<Omit<ImportIssue, "level" | "message">> = {}
): ImportIssue {
  return { level, message, ...ctx };
}
