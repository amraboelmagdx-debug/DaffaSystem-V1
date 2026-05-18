import { NextResponse } from "next/server";
import { resolvePersistenceTruth } from "@/lib/persistence/persistence-truth-registry";
import { buildPersistenceStatusSnapshot } from "@/lib/persistence/persistence-status";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";
import { buildRestartDurabilityChecklist } from "@/lib/persistence/restart-durability-checklist";
import { resolveIncentivePersistenceBackend } from "@/server/incentives/persistence-backend";
import { runPersistenceTruthProbes } from "@/server/persistence/persistence-truth-probes";
import { runPersistenceVerifyRoundtrips } from "@/server/persistence/persistence-verify-roundtrips";

export async function GET() {
  if (!isQaInstrumentationEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snapshot = buildPersistenceStatusSnapshot();
  const probes = await runPersistenceTruthProbes();
  const incentive = await resolveIncentivePersistenceBackend();

  const report = resolvePersistenceTruth({
    snapshot,
    serverProbes: probes,
    incentiveMeta: {
      persistenceBackend: incentive.backend,
      fallbackActive: incentive.fallbackActive,
    },
  });

  const roundtrips = await runPersistenceVerifyRoundtrips();
  const durabilityChecklist = buildRestartDurabilityChecklist(report, probes, roundtrips);

  return NextResponse.json({
    report,
    probes,
    durabilityChecklist,
    roundtrips,
  });
}
