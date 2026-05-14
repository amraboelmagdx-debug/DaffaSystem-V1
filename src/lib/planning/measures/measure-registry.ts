/**
 * Phase 2 — registry API backed by `MEASURE_CATALOG`.
 *
 * 💡 `PLANNING_MEASURE_REGISTRY` ما زال موجوداً للتوافق مع الاستيرادات القديمة،
 * لكنه الآن مشتق من الكتالوج الكامل (metadata).
 */

import type { MeasureId } from "./measure-ids";
import { MEASURE_CATALOG, type MeasureMetadata } from "./measure-catalog";
import type { FormulaOwner } from "./planning-measure-types";

export type { FormulaOwner };

/** @deprecated Prefer MeasureMetadata from measure-catalog */
export type PlanningMeasureDefinition = {
  id: MeasureId;
  label: string;
  dependsOn: readonly MeasureId[];
  owner: FormulaOwner;
  descriptionKey: string;
};

export const PLANNING_MEASURE_REGISTRY: readonly PlanningMeasureDefinition[] = MEASURE_CATALOG.map(
  (m) => ({
    id: m.id,
    label: m.label,
    dependsOn: m.dependsOn,
    owner: m.sourceEngine,
    descriptionKey: m.descriptionKey,
  })
);

/**
 * Topological order over catalog nodes only (edges skip unknown deps).
 */
export function measureRegistryTopologicalOrder(): MeasureId[] {
  const defs = [...MEASURE_CATALOG];
  const ids = new Set(defs.map((d) => d.id));
  const incoming = new Map<MeasureId, number>();
  const outgoing = new Map<MeasureId, MeasureId[]>();
  for (const d of defs) {
    incoming.set(d.id, 0);
    outgoing.set(d.id, []);
  }
  for (const d of defs) {
    for (const dep of d.dependsOn) {
      if (!ids.has(dep)) continue;
      incoming.set(d.id, (incoming.get(d.id) ?? 0) + 1);
      outgoing.get(dep)!.push(d.id);
    }
  }
  const queue = [...ids].filter((id) => (incoming.get(id) ?? 0) === 0);
  const ordered: MeasureId[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    ordered.push(id);
    for (const nxt of outgoing.get(id) ?? []) {
      incoming.set(nxt, (incoming.get(nxt) ?? 1) - 1);
      if ((incoming.get(nxt) ?? 0) === 0) queue.push(nxt);
    }
  }
  if (ordered.length !== ids.size) return [...ids];
  return ordered;
}

export type { MeasureMetadata };
