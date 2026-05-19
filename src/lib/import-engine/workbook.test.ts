import { describe, expect, it } from "vitest";
import { buildTemplateBlob, parseWorkbook } from "./workbook";
import type { TemplateSpec } from "./types";

describe("import-engine workbook", () => {
  it("round-trips a template spec through xlsx", async () => {
    const spec: TemplateSpec = {
      fileName: "test.xlsx",
      instructions: {
        title: "Test template",
        lines: ["Line A", "Line B"],
      },
      sheets: [
        {
          name: "Things",
          columns: [
            { key: "name", label: "Name", required: true, example: "Foo" },
            { key: "amount", label: "Amount", example: 10 },
          ],
        },
      ],
    };
    const blob = buildTemplateBlob(spec);
    const buf = await blob.arrayBuffer();
    const wb = parseWorkbook(buf);
    const things = wb.sheets.find((s) => s.name === "Things");
    expect(things).toBeDefined();
    expect(things?.headers).toEqual(["Name *", "Amount"]);
    expect(things?.rows[0]?.values["Name *"]).toBe("Foo");
    expect(things?.rows[0]?.values.Amount).toBe("10");
  });

  it("creates instructions and validation notes sheets", async () => {
    const spec: TemplateSpec = {
      fileName: "test.xlsx",
      instructions: { title: "Title", lines: ["Hint"] },
      sheets: [
        { name: "Sheet", columns: [{ key: "k", label: "K" }] },
      ],
      validationNotes: ["Note"],
    };
    const blob = buildTemplateBlob(spec);
    const buf = await blob.arrayBuffer();
    const wb = parseWorkbook(buf);
    const sheetNames = wb.sheets.map((s) => s.name);
    expect(sheetNames).toContain("Instructions");
    expect(sheetNames).toContain("Validation");
  });
});
