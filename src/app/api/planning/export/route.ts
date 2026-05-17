import { NextResponse } from "next/server";
import { z } from "zod";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

const bodySchema = z.object({
  format: z.enum(["xlsx", "csv", "pdf"]),
  title: z.string().optional(),
  matrix: z.array(z.array(z.union([z.string(), z.number()]))),
});

export async function POST(req: Request) {
  try {
    await requireTenantContext();
  } catch (err) {
    return tenantErrorResponse(err);
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { format, matrix, title } = parsed.data;
  const safeTitle = (title ?? "planning").replace(/[^\w\-]+/g, "_");

  if (format === "csv") {
    const csv = matrix.map((row) => row.join(",")).join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const ws = XLSX.utils.aoa_to_sheet(matrix);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plan");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeTitle}.xlsx"`,
      },
    });
  }

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title ?? "Planning export", 14, 16);
  if (matrix.length) {
    autoTable(doc, {
      startY: 22,
      head: [matrix[0].map(String)],
      body: matrix.slice(1).map((r) => r.map(String)),
      styles: { fontSize: 7 },
    });
  }
  const out = doc.output("arraybuffer");
  return new NextResponse(out, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
    },
  });
}
