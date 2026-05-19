import type { ImportAdapter } from "./types";

const registry = new Map<string, ImportAdapter<unknown, unknown>>();

export function registerImportAdapter(adapter: ImportAdapter<unknown, unknown>): void {
  registry.set(adapter.id, adapter);
}

export function getImportAdapter(
  id: string
): ImportAdapter<unknown, unknown> | undefined {
  return registry.get(id);
}

export function listImportAdapters(): ImportAdapter<unknown, unknown>[] {
  return Array.from(registry.values());
}
