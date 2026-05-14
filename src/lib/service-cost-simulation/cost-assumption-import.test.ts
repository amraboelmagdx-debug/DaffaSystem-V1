import { describe, expect, it } from "vitest";
import { buildServiceCostAssumptionImportPreview, exportAssumptionsToImportRows } from "./cost-assumption-import";
import { DEFAULT_SERVICE_COST_ASSUMPTIONS } from "./defaults";

describe("buildServiceCostAssumptionImportPreview", () => {
  it("merges valid rows", () => {
    const r = buildServiceCostAssumptionImportPreview([
      { assumptionKey: "qaSensitivityFactor", numericValue: "1.5" },
      { assumptionKey: "implicitWrapLoadedCostFraction", numericValue: "0.05" },
    ]);
    expect(r.valid).toBe(true);
    expect(r.mergedAssumptions.qaSensitivityFactor).toBe(1.5);
    expect(r.mergedAssumptions.implicitWrapLoadedCostFraction).toBe(0.05);
  });

  it("rejects unknown keys", () => {
    const r = buildServiceCostAssumptionImportPreview([{ assumptionKey: "unknown", numericValue: "1" }]);
    expect(r.valid).toBe(false);
  });

  it("round-trips export rows through preview", () => {
    const rows = exportAssumptionsToImportRows(DEFAULT_SERVICE_COST_ASSUMPTIONS);
    const r = buildServiceCostAssumptionImportPreview(rows);
    expect(r.valid).toBe(true);
    expect(r.mergedAssumptions).toEqual(DEFAULT_SERVICE_COST_ASSUMPTIONS);
  });
});
