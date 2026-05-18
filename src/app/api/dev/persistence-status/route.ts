import { NextResponse } from "next/server";
import { buildPersistenceStatusSnapshot } from "@/lib/persistence/persistence-status";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";
import {
  probeIncentiveMigration013,
  resolveIncentivePersistenceBackend,
} from "@/server/incentives/persistence-backend";

export async function GET() {
  if (!isQaInstrumentationEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snapshot = buildPersistenceStatusSnapshot();
  const backend = await resolveIncentivePersistenceBackend();
  const migration013Ok = await probeIncentiveMigration013();

  return NextResponse.json({
    ...snapshot,
    incentiveBackend: backend.backend,
    fallbackActive: backend.fallbackActive,
    clientAvailable: backend.clientAvailable,
    migration013Ok,
  });
}
