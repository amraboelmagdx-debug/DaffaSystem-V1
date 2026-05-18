import { NextResponse } from "next/server";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";
import { runPersistenceVerifyRoundtrips } from "@/server/persistence/persistence-verify-roundtrips";

export async function GET() {
  if (!isQaInstrumentationEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const roundtrips = await runPersistenceVerifyRoundtrips();
  const allPassed = roundtrips.every((c) => c.passed);

  return NextResponse.json({
    allPassed,
    roundtrips,
  });
}
