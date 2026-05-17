import * as XLSX from "xlsx";
import type { ParsedImportRow } from "./import-parser";

export interface SheetParseResult {
  headers: string[];
  rows: ParsedImportRow[];
}

/**
 * Reads first worksheet from .xlsx / .xls / .csv (SheetJS).
 */
export function parseWorkbookFirstSheet(data: ArrayBuffer): SheetParseResult {
  const wb = XLSX.read(data, { type: "array" });
  const name = wb.SheetNames[0];
  if (!name) return { headers: [], rows: [] };
  const sheet = wb.Sheets[name];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (!matrix.length) return { headers: [], rows: [] };

  const headerRow = (matrix[0] ?? []).map((c, i) => {
    const s = String(c ?? "").trim();
    return s || `Column${i + 1}`;
  });
  const rows: ParsedImportRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const values: Record<string, string> = {};
    for (let c = 0; c < headerRow.length; c++) {
      const key = headerRow[c] ?? `Column${c + 1}`;
      values[key] = String(line[c] ?? "").trim();
    }
    if (Object.values(values).every((v) => v === "")) continue;
    rows.push({ rowIndex: r + 1, values });
  }

  return { headers: headerRow, rows };
}

export function buildTemplateSheetBlob(): Blob {
  const headers = [
    "Business Unit",
    "Department",
    "Team",
    "Role Name",
    "Employment Type",
    "Employee Count",
    "Monthly Salary",
    "Monthly Social Insurance",
    "Annual Medical Insurance",
    "Annual EOS Cost",
    "Risk Factor %",
    "Is Billable",
    "Additional Costs",
  ];
  const example = [
    "ZAN",
    "Engineering",
    "Platform",
    "Senior Engineer",
    "full_time",
    "3",
    "18000",
    "1200",
    "6000",
    "24000",
    "5",
    "true",
    "Laptop fund:500:fixed:monthly|Training:10:percentage:yearly",
  ];
  const readme = [
    ["HR import — how rows map to the platform"],
    [""],
    ["Holding / organization", "Your tenant name is set in Settings — not imported from this file."],
    [
      "Business Unit",
      "Operational unit (e.g. ZAN). Active units sync to Executive, Sales Plan, and Service Architecture as the workspace “company”.",
    ],
    [
      "Department",
      "Creates revenue streams under that business unit (used by Sales Plan “Import from streams”).",
    ],
    ["Team / Role columns", "Workforce structure and cost inputs for HR intelligence."],
    [""],
    ["Example row below uses Business Unit = ZAN — replace with your unit names."],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wsReadme = XLSX.utils.aoa_to_sheet(readme);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Workforce");
  XLSX.utils.book_append_sheet(wb, wsReadme, "Readme");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return new Blob([buf as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
