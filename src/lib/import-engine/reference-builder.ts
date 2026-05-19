import type { ReferenceSheetSpec } from "./types";

/** Convenience: build a reference sheet from an array of records (uniform keys). */
export function buildRefSheet(
  name: string,
  rows: Array<Record<string, string | number | boolean | null | undefined>>,
  options?: { description?: string; columnOrder?: string[] }
): ReferenceSheetSpec {
  const headerSet = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) headerSet.add(k);
  let headers = Array.from(headerSet);
  if (options?.columnOrder?.length) {
    const order = options.columnOrder;
    headers = [
      ...order.filter((h) => headerSet.has(h)),
      ...headers.filter((h) => !order.includes(h)),
    ];
  }
  const matrix = rows.map((r) => headers.map((h) => (r[h] as string | number | boolean | null) ?? ""));
  return { name, headers, rows: matrix, description: options?.description };
}
