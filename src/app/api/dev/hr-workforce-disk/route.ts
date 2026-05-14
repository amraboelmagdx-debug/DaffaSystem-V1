import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const REL_PATH = ["data", "hr-workforce-persist.json"] as const;

function diskSyncAllowed(): boolean {
  return process.env.NODE_ENV === "development" || process.env.HR_WORKFORCE_DISK_SYNC === "1";
}

function filePath(): string {
  return path.join(process.cwd(), ...REL_PATH);
}

/** Dev-only mirror of Zustand persist blob for `efp-hr-workforce` — shared across localhost ports. */
export async function GET() {
  if (!diskSyncAllowed()) {
    return new NextResponse(null, { status: 404 });
  }
  const fp = filePath();
  try {
    const buf = await fs.readFile(fp, "utf8");
    if (!buf.trim()) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function PUT(req: Request) {
  if (!diskSyncAllowed()) {
    return NextResponse.json({ error: "Disk sync disabled" }, { status: 404 });
  }
  const text = await req.text();
  const fp = filePath();
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, text, "utf8");
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!diskSyncAllowed()) {
    return NextResponse.json({ error: "Disk sync disabled" }, { status: 404 });
  }
  try {
    await fs.unlink(filePath());
  } catch {
    /* missing file */
  }
  return NextResponse.json({ ok: true });
}
