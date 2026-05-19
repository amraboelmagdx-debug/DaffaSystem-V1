/** Case-insensitive trimmed key for name-based lookups across sheets. */
export function ciKey(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Parse a numeric cell that may contain commas or whitespace. */
export function num(raw: string | number | null | undefined, def = 0): number {
  if (raw == null) return def;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : def;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : def;
}

/** Parse a boolean cell: yes/true/1/y → true; falls back to default. */
export function bool(raw: string | number | boolean | null | undefined, def = false): boolean {
  if (raw == null) return def;
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  if (!s) return def;
  if (["true", "yes", "y", "1", "on", "✓", "x"].includes(s)) return true;
  if (["false", "no", "n", "0", "off", ""].includes(s)) return false;
  return def;
}

/** Normalize a column header for matching (trim + lower + single spaces). */
export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

export type HeaderMatchRule = {
  exact?: string[];
  includes?: string[];
  excludes?: string[];
};

/** Best-matching sheet header for a logical field (exact > substring). */
export function matchHeader(headers: string[], rule: HeaderMatchRule): string | undefined {
  let best: { header: string; score: number } | null = null;
  for (const header of headers) {
    const n = normalizeHeader(header);
    if (rule.excludes?.some((ex) => n.includes(ex))) continue;
    let score = 0;
    for (const e of rule.exact ?? []) if (n === e) score = Math.max(score, 100);
    for (const inc of rule.includes ?? []) if (n.includes(inc)) score = Math.max(score, 60);
    if (score > 0 && (!best || score > best.score)) best = { header, score };
  }
  return best?.header;
}

/** Pick the first non-empty cell for any of the given column candidates. */
export function pickCell(
  row: Record<string, string>,
  ...candidates: (string | undefined)[]
): string {
  for (const c of candidates) {
    if (!c) continue;
    const v = row[c];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
