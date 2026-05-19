/**
 * High-level template helpers. Keep small — most logic lives in domain `template.ts`.
 */
import type { SheetSpec } from "./types";

/** Convenience: build a SheetSpec from header descriptors. */
export function sheetSpec(
  name: string,
  columns: SheetSpec["columns"],
  options?: Pick<SheetSpec, "description" | "rows">
): SheetSpec {
  return {
    name,
    columns,
    description: options?.description,
    rows: options?.rows,
  };
}
