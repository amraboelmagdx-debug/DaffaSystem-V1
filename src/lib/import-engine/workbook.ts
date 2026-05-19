import * as XLSX from "xlsx";
import type {
  ParsedRow,
  ParsedSheet,
  ParsedWorkbook,
  ReferenceSheetSpec,
  SheetSpec,
  TemplateSpec,
} from "./types";

/** Read every worksheet from an xlsx/csv ArrayBuffer into a normalized structure. */
export function parseWorkbook(data: ArrayBuffer): ParsedWorkbook {
  const wb = XLSX.read(data, { type: "array" });
  const sheets: ParsedSheet[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];
    if (!matrix.length) {
      sheets.push({ name: sheetName, headers: [], rows: [] });
      continue;
    }
    const headerRow = (matrix[0] ?? []).map((c, i) => {
      const s = String(c ?? "").trim();
      return s || `Column${i + 1}`;
    });
    const rows: ParsedRow[] = [];
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
    sheets.push({ name: sheetName, headers: headerRow, rows });
  }
  return { sheets };
}

export function findSheet(workbook: ParsedWorkbook, name: string): ParsedSheet | undefined {
  const target = name.trim().toLowerCase();
  return workbook.sheets.find((s) => s.name.trim().toLowerCase() === target);
}

/** Build an xlsx blob from a TemplateSpec — instructions + reference sheets + data sheets + notes. */
export function buildTemplateBlob(spec: TemplateSpec): Blob {
  const wb = XLSX.utils.book_new();

  const instr: (string | number)[][] = [
    [spec.instructions.title],
    [],
    ...spec.instructions.lines.map((l) => [l]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instr), safeSheetName("Instructions"));

  for (const ref of spec.referenceSheets ?? []) {
    const aoa: (string | number | boolean | null)[][] = [];
    if (ref.description) aoa.push([ref.description]);
    aoa.push(ref.headers);
    for (const row of ref.rows) aoa.push(row);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(`Ref · ${ref.name}`));
  }

  for (const sheet of spec.sheets) {
    XLSX.utils.book_append_sheet(wb, sheetSpecToWs(sheet), safeSheetName(sheet.name));
  }

  if (spec.validationNotes?.length) {
    const aoa = spec.validationNotes.map((n) => [n]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Validation notes"], [], ...aoa]),
      safeSheetName("Validation")
    );
  }

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return new Blob([buf as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function sheetSpecToWs(sheet: SheetSpec) {
  const headers = sheet.columns.map((c) => (c.required ? `${c.label} *` : c.label));
  const aoa: (string | number | boolean | null)[][] = [headers];
  if (sheet.rows && sheet.rows.length) {
    for (const r of sheet.rows) {
      aoa.push(sheet.columns.map((c) => (r[c.key] as string | number | boolean | null) ?? ""));
    }
  } else {
    aoa.push(
      sheet.columns.map((c) =>
        c.example != null ? c.example : c.enumValues?.[0] ?? ""
      )
    );
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colWidths = sheet.columns.map((c) => ({
    wch: Math.min(40, Math.max(12, c.label.length + 4)),
  }));
  (ws as { ["!cols"]?: { wch: number }[] })["!cols"] = colWidths;
  return ws;
}

function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
