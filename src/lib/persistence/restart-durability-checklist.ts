import type {
  PersistenceTruthReport,
  ServerProbeResults,
} from "@/lib/persistence/persistence-truth-registry";
import type { RoundtripCheck } from "@/lib/persistence/persistence-verify-types";

export type DurabilityCheckItem = {
  id: string;
  label: string;
  passed: boolean;
  explanation: string;
  recommendedAction: string;
};

function roundtripPassed(
  roundtrips: RoundtripCheck[] | undefined,
  id: string
): boolean | null {
  const row = roundtrips?.find((r) => r.id === id);
  return row ? row.passed : null;
}

export function buildRestartDurabilityChecklist(
  report: PersistenceTruthReport,
  probes?: ServerProbeResults | null,
  roundtrips?: RoundtripCheck[]
): DurabilityCheckItem[] {
  const critical = [
    "hr_catalog",
    "service_catalog",
    "planning_workspace",
    "scenario_bundles",
    "incentive_plans_runs",
  ] as const;

  const items: DurabilityCheckItem[] = critical.map((id) => {
    const row = report.domains.find((d) => d.domainId === id);
    if (!row) {
      return {
        id,
        label: id,
        passed: false,
        explanation: "Domain not found in truth report.",
        recommendedAction: "Reload persistence truth panel.",
      };
    }

    let passed = row.restartSafe;
    if (id === "hr_catalog") {
      const rt = roundtripPassed(roundtrips, "hr_read");
      if (rt === false) passed = false;
    }
    if (id === "service_catalog") {
      const rt = roundtripPassed(roundtrips, "sa_read");
      if (rt === false) passed = false;
    }
    if (id === "planning_workspace") {
      const rt = roundtripPassed(roundtrips, "planning_read");
      if (rt === false) passed = false;
    }
    if (id === "incentive_plans_runs") {
      const rt = roundtripPassed(roundtrips, "incentive_read");
      if (rt === false) passed = false;
    }

    return {
      id,
      label: row.label,
      passed,
      explanation: passed
        ? `${row.label} is restart-safe (${row.backend}).`
        : `${row.label} is NOT restart-safe (${row.backend}). ${row.risks[0] ?? probes?.probeErrors?.[0] ?? ""}`,
      recommendedAction: row.recommendedAction,
    };
  });

  const authRt = roundtripPassed(roundtrips, "auth");
  items.push({
    id: "auth",
    label: "Authenticated session",
    passed: authRt ?? report.authSessionOk === true,
    explanation:
      report.authSessionOk === true
        ? "Tenant context resolves for API writes."
        : probes?.authError ?? "No valid session; server writes may return 401.",
    recommendedAction: "Sign in and retry workspace bootstrap.",
  });

  const m013Rt = roundtripPassed(roundtrips, "migration_013");
  items.push({
    id: "migration_013",
    label: "Incentive migration 013",
    passed: m013Rt ?? report.migration013Ok === true,
    explanation:
      report.migration013Ok === true
        ? "incentive_plans table is readable."
        : "Migration 013 missing or incentives tables unavailable.",
    recommendedAction: "Run supabase migration 013_incentive_operations.sql.",
  });

  items.push({
    id: "sales_plan_wizard",
    label: "Sales Plan wizard (expected local)",
    passed: true,
    explanation:
      "Wizard is local-only by design; not a restart durability failure.",
    recommendedAction: "Apply plan to workspace for server-backed targets.",
  });

  items.push({
    id: "compare_runs",
    label: "Run compare (expected ephemeral)",
    passed: true,
    explanation: "Compare UI state is ephemeral by design.",
    recommendedAction: "Re-select runs from persisted History after refresh.",
  });

  return items;
}

export function durabilityChecklistSummary(items: DurabilityCheckItem[]): {
  passed: number;
  failed: number;
  allCriticalPassed: boolean;
} {
  const criticalIds = new Set([
    "hr_catalog",
    "service_catalog",
    "planning_workspace",
    "scenario_bundles",
    "incentive_plans_runs",
    "auth",
    "migration_013",
  ]);
  const critical = items.filter((i) => criticalIds.has(i.id));
  const passed = critical.filter((i) => i.passed).length;
  const failed = critical.length - passed;
  return {
    passed,
    failed,
    allCriticalPassed: failed === 0,
  };
}
