import { describe, expect, it } from "vitest";
import { MEASURE_ID, type MeasureId } from "./measure-ids";
import { assertFullMeasureCatalog, MEASURE_CATALOG } from "./measure-catalog";

describe("MEASURE_CATALOG governance", () => {
  it("includes every MEASURE_ID (no drift)", () => {
    assertFullMeasureCatalog();
    const catalogIds = new Set(MEASURE_CATALOG.map((m) => m.id));
    const allIds = Object.values(MEASURE_ID) as MeasureId[];
    expect(catalogIds.size).toBe(allIds.length);
    for (const id of allIds) {
      expect(catalogIds.has(id)).toBe(true);
    }
  });

  it("has unique ids", () => {
    const ids = MEASURE_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
