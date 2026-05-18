"use client";

import { useEffect, useState } from "react";
import type { PersistenceTruthReport } from "@/lib/persistence/persistence-truth-registry";
import type { DurabilityCheckItem } from "@/lib/persistence/restart-durability-checklist";
import type { ServerProbeResults } from "@/lib/persistence/persistence-truth-registry";

export type PersistenceTruthPayload = {
  report: PersistenceTruthReport;
  probes: ServerProbeResults;
  durabilityChecklist: DurabilityCheckItem[];
};

let cached: PersistenceTruthPayload | null = null;
let inflight: Promise<PersistenceTruthPayload | null> | null = null;

async function fetchPersistenceTruth(): Promise<PersistenceTruthPayload | null> {
  if (inflight) return inflight;
  inflight = fetch("/api/dev/persistence-truth")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data?.report) return null;
      const payload: PersistenceTruthPayload = {
        report: data.report as PersistenceTruthReport,
        probes: data.probes as ServerProbeResults,
        durabilityChecklist: (data.durabilityChecklist ?? []) as DurabilityCheckItem[],
      };
      cached = payload;
      return payload;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function usePersistenceTruth(enabled = true) {
  const [data, setData] = useState<PersistenceTruthPayload | null>(cached);
  const [loading, setLoading] = useState(enabled && !cached);

  useEffect(() => {
    if (!enabled) return;
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchPersistenceTruth().then((payload) => {
      setData(payload);
      setLoading(false);
    });
  }, [enabled]);

  const refresh = () => {
    cached = null;
    setLoading(true);
    return fetchPersistenceTruth().then((payload) => {
      setData(payload);
      setLoading(false);
      return payload;
    });
  };

  return { data, loading, refresh };
}
