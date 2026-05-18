"use client";

import { AlertTriangle } from "lucide-react";
import {
  buildPersistenceStatusSnapshot,
  isPersistenceBannerEnabled,
} from "@/lib/persistence/persistence-status";
import { usePersistenceTruth } from "@/hooks/use-persistence-truth";

export function PersistenceStatusBanner() {
  const status = buildPersistenceStatusSnapshot();
  const { data, loading } = usePersistenceTruth(isPersistenceBannerEnabled());

  if (!isPersistenceBannerEnabled()) return null;

  const pilotVerdict =
    data?.report.pilotVerdict ??
    (loading ? "Loading persistence truth…" : "Persistence truth unavailable.");

  const warnings: string[] = [pilotVerdict];
  if (status.supabaseConfigured && status.persistMode === "local_only") {
    warnings.push("Supabase is configured but PERSIST_MODE=local_only (pilot misconfig).");
  }
  if (data?.probes.probeErrors?.length) {
    warnings.push(
      `Probe failures: ${data.probes.probeErrors.slice(0, 2).join("; ")}${
        data.probes.probeErrors.length > 2 ? "…" : ""
      }`
    );
  }
  if (status.incentiveBackendHint === "memory") {
    warnings.push("Incentives using in-memory persistence (data lost on server restart).");
  }
  if (status.incentiveBackendHint === "unavailable" && !data?.report) {
    warnings.push(
      "Incentive persistence unavailable. Set INCENTIVE_ALLOW_MEMORY_FALLBACK=true for local dev or configure Supabase."
    );
  }

  const isError =
    status.incentiveBackendHint === "unavailable" ||
    (data?.durabilityChecklist.some(
      (i) =>
        ["hr_catalog", "incentive_plans_runs", "migration_013", "auth"].includes(i.id) &&
        !i.passed
    ) ??
      false);

  return (
    <div
      role="status"
      className={`border-b px-4 py-2 text-xs ${
        isError
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <ul className="list-inside list-disc space-y-0.5">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
