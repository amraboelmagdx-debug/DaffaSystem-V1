import { buildPersistenceStatusSnapshot } from "@/lib/persistence/persistence-status";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";

const emitted = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (!isQaInstrumentationEnabled()) return;
  if (emitted.has(key)) return;
  emitted.add(key);
  console.warn(`[EFP Pilot] ${message}`);
}

/** Call once after tenant persistence provider mounts (client). */
export function emitPilotConfigWarnings(): void {
  const snap = buildPersistenceStatusSnapshot();
  if (snap.supabaseConfigured && snap.persistMode === "local_only") {
    warnOnce(
      "pilot-local-only",
      "Supabase is configured but PERSIST_MODE=local_only. Pilot/staging should use dual_write."
    );
  }
  if (snap.incentiveBackendHint === "memory") {
    warnOnce(
      "pilot-incentive-memory",
      "Incentives may use in-memory persistence. Data will not survive server restart."
    );
  }
  if (snap.incentiveBackendHint === "unavailable" && snap.supabaseConfigured) {
    warnOnce(
      "pilot-incentive-unavailable",
      "Incentive persistence unavailable. Set INCENTIVE_ALLOW_MEMORY_FALLBACK=true for local dev only."
    );
  }
}

export function resetPilotConfigWarningsForTests(): void {
  emitted.clear();
}
