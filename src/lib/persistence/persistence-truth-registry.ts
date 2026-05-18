import type { IncentiveApiMeta } from "@/lib/incentives/api-meta";
import {
  buildPersistenceStatusSnapshot,
  type PersistenceStatusSnapshot,
} from "@/lib/persistence/persistence-status";
import {
  getPersistMode,
  shouldHydrateHrCatalogFromServer,
  shouldHydrateServiceCatalogFromServer,
  shouldHydrateWorkspaceFromServer,
  shouldSyncToServer,
} from "@/lib/persistence/persist-mode";

export type PersistenceBackendKind =
  | "supabase"
  | "localStorage"
  | "memory"
  | "mixed"
  | "unavailable"
  | "ephemeral";

export type PilotPersistenceMode =
  | "server_authoritative"
  | "dual_write_cache"
  | "local_only"
  | "ephemeral";

export type PersistenceDomainId =
  | "hr_catalog"
  | "service_catalog"
  | "planning_workspace"
  | "scenario_bundles"
  | "sales_plan_wizard"
  | "sales_plan_workspace_apply"
  | "incentive_plans_runs"
  | "incentive_presets"
  | "incentive_compare_runs"
  | "incentive_audit";

export type DomainTruthRow = {
  domainId: PersistenceDomainId;
  label: string;
  writePath: string;
  readPath: string;
  expectedPilotMode: PilotPersistenceMode;
  migrationDeps: string[];
  backend: PersistenceBackendKind;
  hydrationSource: string;
  fallbackActive: boolean;
  migrationOk: boolean | null;
  probeOk: boolean | null;
  restartSafe: boolean;
  hardRefreshSafe: boolean;
  tenantScoped: boolean;
  serverAuthoritative: boolean;
  risks: string[];
  recommendedAction: string;
};

export type PersistenceTruthReport = {
  generatedAt: string;
  persistMode: ReturnType<typeof getPersistMode>;
  supabaseConfigured: boolean;
  tenantNamespaced: boolean;
  authSessionOk: boolean | null;
  incentiveBackend: "supabase" | "memory" | "unavailable";
  incentiveFallbackActive: boolean;
  migration013Ok: boolean | null;
  domains: DomainTruthRow[];
  pilotVerdict: string;
  serverAuthoritativeCount: number;
  localOrEphemeralCount: number;
};

export type TableProbeDetail = {
  ok: boolean;
  error: string | null;
};

export type ServerProbeResults = {
  authSessionOk: boolean;
  authError?: string | null;
  migration013Ok: boolean;
  hrCatalogProbeOk: boolean;
  serviceCatalogProbeOk: boolean;
  scenariosProbeOk: boolean;
  companiesProbeOk: boolean;
  supabaseClientAvailable: boolean;
  tableProbes?: Record<string, TableProbeDetail>;
  probeErrors?: string[];
};

export type ResolvePersistenceTruthInput = {
  snapshot?: PersistenceStatusSnapshot;
  serverProbes?: ServerProbeResults | null;
  incentiveMeta?: IncentiveApiMeta | null;
};

const DOMAIN_META: Array<{
  domainId: PersistenceDomainId;
  label: string;
  writePath: string;
  readPath: string;
  expectedPilotMode: PilotPersistenceMode;
  migrationDeps: string[];
}> = [
  {
    domainId: "hr_catalog",
    label: "HR catalog (BUs, roles)",
    writePath: "PUT /api/org/hr-catalog (when dual_write)",
    readPath: "GET /api/org/hr-catalog + hydrateHrCatalogFromServer",
    expectedPilotMode: "dual_write_cache",
    migrationDeps: ["005", "006"],
  },
  {
    domainId: "service_catalog",
    label: "Service architecture catalog",
    writePath: "PUT /api/org/service-catalog (when dual_write)",
    readPath: "GET /api/org/service-catalog + hydrate",
    expectedPilotMode: "dual_write_cache",
    migrationDeps: ["008"],
  },
  {
    domainId: "planning_workspace",
    label: "Planning workspace (companies, streams, matrix)",
    writePath: "POST /api/platform/economics/sync, matrix API",
    readPath: "GET /api/planning/workspace + bootstrap",
    expectedPilotMode: "dual_write_cache",
    migrationDeps: ["002", "012"],
  },
  {
    domainId: "scenario_bundles",
    label: "Scenario bundles + governance",
    writePath: "POST/PUT /api/planning/scenarios",
    readPath: "Workspace hydrate + Zustand scenarioBundles",
    expectedPilotMode: "dual_write_cache",
    migrationDeps: ["002"],
  },
  {
    domainId: "sales_plan_wizard",
    label: "Sales Plan wizard state",
    writePath: "Zustand persist (efp-sales-plan-wizard)",
    readPath: "localStorage rehydrate only",
    expectedPilotMode: "local_only",
    migrationDeps: [],
  },
  {
    domainId: "sales_plan_workspace_apply",
    label: "Sales Plan → workspace apply",
    writePath: "applyPlanToWorkspace → workspace store",
    readPath: "Executive / economics graph",
    expectedPilotMode: "dual_write_cache",
    migrationDeps: [],
  },
  {
    domainId: "incentive_plans_runs",
    label: "Incentive plans, runs, snapshots, freezes",
    writePath: "/api/incentives/plans, /runs, /freezes",
    readPath: "loadPlans / loadRuns / loadFreezes",
    expectedPilotMode: "server_authoritative",
    migrationDeps: ["013"],
  },
  {
    domainId: "incentive_presets",
    label: "Incentive simulator presets",
    writePath: "POST /api/incentives/presets",
    readPath: "GET /api/incentives/presets",
    expectedPilotMode: "server_authoritative",
    migrationDeps: ["013"],
  },
  {
    domainId: "incentive_compare_runs",
    label: "Run compare selection (UI)",
    writePath: "Client state only",
    readPath: "N/A",
    expectedPilotMode: "ephemeral",
    migrationDeps: [],
  },
  {
    domainId: "incentive_audit",
    label: "Incentive override audit",
    writePath: "POST incentive_override_audit (server)",
    readPath: "GET /api/incentives/audit",
    expectedPilotMode: "server_authoritative",
    migrationDeps: ["013"],
  },
];

function resolveHrBackend(
  snapshot: PersistenceStatusSnapshot,
  probes: ServerProbeResults | null | undefined
): Pick<
  DomainTruthRow,
  "backend" | "hydrationSource" | "migrationOk" | "probeOk" | "restartSafe" | "serverAuthoritative"
> {
  const sync = shouldSyncToServer();
  if (!snapshot.supabaseConfigured) {
    return {
      backend: "localStorage",
      hydrationSource: "localStorage + optional GET",
      migrationOk: null,
      probeOk: null,
      restartSafe: false,
      serverAuthoritative: false,
    };
  }
  if (!sync) {
    return {
      backend: "localStorage",
      hydrationSource: "localStorage only (local_only mode)",
      migrationOk: probes?.hrCatalogProbeOk ?? null,
      probeOk: probes?.hrCatalogProbeOk ?? null,
      restartSafe: false,
      serverAuthoritative: false,
    };
  }
  const probeOk = probes?.hrCatalogProbeOk ?? null;
  const backend: PersistenceBackendKind =
    probeOk === false
      ? "unavailable"
      : probeOk === true
        ? "supabase"
        : "mixed";
  return {
    backend,
    hydrationSource: snapshot.hydration.hrFromServer
      ? "server GET + local cache (server wins on hydrate)"
      : "local cache",
    migrationOk: probeOk,
    probeOk,
    restartSafe: probeOk === true && (probes?.authSessionOk ?? true),
    serverAuthoritative: probeOk === true && sync,
  };
}

function resolveSaBackend(
  snapshot: PersistenceStatusSnapshot,
  probes: ServerProbeResults | null | undefined
): Pick<
  DomainTruthRow,
  "backend" | "hydrationSource" | "migrationOk" | "probeOk" | "restartSafe" | "serverAuthoritative"
> {
  const sync = shouldSyncToServer();
  if (!snapshot.supabaseConfigured) {
    return {
      backend: "localStorage",
      hydrationSource: "localStorage + optional GET",
      migrationOk: null,
      probeOk: null,
      restartSafe: false,
      serverAuthoritative: false,
    };
  }
  if (!sync) {
    return {
      backend: "localStorage",
      hydrationSource: "localStorage only (local_only mode)",
      migrationOk: probes?.serviceCatalogProbeOk ?? null,
      probeOk: probes?.serviceCatalogProbeOk ?? null,
      restartSafe: false,
      serverAuthoritative: false,
    };
  }
  const probeOk = probes?.serviceCatalogProbeOk ?? null;
  const backend: PersistenceBackendKind =
    probeOk === false
      ? "unavailable"
      : probeOk === true
        ? "supabase"
        : "mixed";
  return {
    backend,
    hydrationSource: snapshot.hydration.serviceFromServer
      ? "server GET + local cache (server wins on hydrate)"
      : "local cache",
    migrationOk: probeOk,
    probeOk,
    restartSafe: probeOk === true && (probes?.authSessionOk ?? true),
    serverAuthoritative: probeOk === true && sync,
  };
}

function resolveIncentiveBackendKind(
  snapshot: PersistenceStatusSnapshot,
  meta: IncentiveApiMeta | null | undefined,
  probes: ServerProbeResults | null | undefined
): IncentiveApiMeta["persistenceBackend"] {
  if (meta?.persistenceBackend) return meta.persistenceBackend;
  return snapshot.incentiveBackendHint;
}

function buildDomainRow(
  meta: (typeof DOMAIN_META)[number],
  snapshot: PersistenceStatusSnapshot,
  probes: ServerProbeResults | null | undefined,
  incentiveBackend: "supabase" | "memory" | "unavailable",
  incentiveFallbackActive: boolean
): DomainTruthRow {
  const tenantScoped = snapshot.tenantNamespaced;
  const base = {
    domainId: meta.domainId,
    label: meta.label,
    writePath: meta.writePath,
    readPath: meta.readPath,
    expectedPilotMode: meta.expectedPilotMode,
    migrationDeps: meta.migrationDeps,
    tenantScoped,
    fallbackActive: false,
    migrationOk: null as boolean | null,
    probeOk: null as boolean | null,
    hardRefreshSafe: false,
    restartSafe: false,
    serverAuthoritative: false,
    backend: "unavailable" as PersistenceBackendKind,
    hydrationSource: "—",
    risks: [] as string[],
    recommendedAction: "Verify environment configuration.",
  };

  switch (meta.domainId) {
    case "hr_catalog": {
      const hr = resolveHrBackend(snapshot, probes);
      return {
        ...base,
        ...hr,
        hardRefreshSafe: hr.restartSafe,
        fallbackActive: !shouldSyncToServer() && snapshot.supabaseConfigured,
        risks: !shouldSyncToServer()
          ? ["PERSIST_MODE is local_only; HR writes stay in browser only."]
          : hr.probeOk === false
            ? ["hr_workforce_catalog table not reachable."]
            : [],
        recommendedAction: shouldSyncToServer()
          ? "Use dual_write and confirm HR catalog PUT succeeds in network tab."
          : "Set NEXT_PUBLIC_PERSIST_MODE=dual_write for pilot.",
      };
    }
    case "service_catalog": {
      const sa = resolveSaBackend(snapshot, probes);
      return {
        ...base,
        ...sa,
        hardRefreshSafe: sa.restartSafe,
        fallbackActive: !shouldSyncToServer() && snapshot.supabaseConfigured,
        risks: !shouldSyncToServer()
          ? ["Service catalog not synced to server."]
          : sa.probeOk === false
            ? ["service_architecture_catalog table not reachable."]
            : [],
        recommendedAction: shouldSyncToServer()
          ? "Confirm service catalog dual-write flush."
          : "Enable dual_write for server-backed catalog.",
      };
    }
    case "planning_workspace": {
      const probeOk =
        probes?.companiesProbeOk === true && probes?.scenariosProbeOk === true;
      const hydrate = shouldHydrateWorkspaceFromServer();
      const authOk = probes?.authSessionOk ?? null;
      const serverBacked = probeOk && hydrate && authOk === true;
      return {
        ...base,
        backend: !snapshot.supabaseConfigured
          ? "localStorage"
          : serverBacked
            ? "supabase"
            : hydrate
              ? "mixed"
              : "localStorage",
        hydrationSource: hydrate
          ? "GET /api/planning/workspace on bootstrap (local cache until hydrate)"
          : "Zustand localStorage only",
        migrationOk: probeOk,
        probeOk,
        restartSafe: Boolean(serverBacked),
        hardRefreshSafe: Boolean(serverBacked),
        serverAuthoritative: Boolean(serverBacked),
        fallbackActive: snapshot.supabaseConfigured && !hydrate,
        risks: [
          ...(authOk === false ? ["Auth session missing; planning sync returns 401."] : []),
          ...(!hydrate ? ["Workspace server hydrate disabled or Supabase off."] : []),
        ],
        recommendedAction:
          authOk === false
            ? "Sign in and retry workspace bootstrap."
            : "Enable WORKSPACE_SERVER_HYDRATE and run economics sync after changes.",
      };
    }
    case "scenario_bundles": {
      const probeOk = probes?.scenariosProbeOk ?? null;
      const sync = shouldSyncToServer() && snapshot.supabaseConfigured;
      const authOk = probes?.authSessionOk ?? null;
      const serverBacked = sync && probeOk === true && authOk === true;
      return {
        ...base,
        backend: !sync
          ? "localStorage"
          : serverBacked
            ? "supabase"
            : "mixed",
        hydrationSource: "scenarios table (canonical) + Zustand cache until hydrate",
        migrationOk: probeOk,
        probeOk,
        restartSafe: Boolean(serverBacked),
        hardRefreshSafe: Boolean(serverBacked),
        serverAuthoritative: Boolean(serverBacked),
        fallbackActive: !sync,
        risks: [
          "Governance JSON stored in scenarios.assumptions; local cache can diverge until hydrate.",
          "Failed scenario PUT is now surfaced in QA panel.",
        ],
        recommendedAction:
          "After editing scenarios, confirm PUT /api/planning/scenarios succeeds; hard refresh to rehydrate.",
      };
    }
    case "sales_plan_wizard":
      return {
        ...base,
        backend: "localStorage",
        hydrationSource: "localStorage (efp-sales-plan-wizard)",
        migrationOk: null,
        probeOk: null,
        restartSafe: false,
        hardRefreshSafe: false,
        serverAuthoritative: false,
        risks: ["Wizard state is not server-persisted until Apply to workspace."],
        recommendedAction: "Click Apply to workspace to push targets into planning workspace.",
      };
    case "sales_plan_workspace_apply":
      return {
        ...base,
        backend: shouldSyncToServer() && snapshot.supabaseConfigured ? "mixed" : "localStorage",
        hydrationSource: "Workspace store after apply",
        migrationOk: probes?.companiesProbeOk ?? null,
        probeOk: probes?.companiesProbeOk ?? null,
        restartSafe: shouldSyncToServer() && probes?.companiesProbeOk === true,
        hardRefreshSafe: shouldSyncToServer() && probes?.companiesProbeOk === true,
        serverAuthoritative: shouldSyncToServer() && probes?.companiesProbeOk === true,
        risks: ["Depends on planning workspace sync completing."],
        recommendedAction: "Apply plan, then run planning sync or wait for dual-write flush.",
      };
    case "incentive_plans_runs": {
      const m013 = probes?.migration013Ok ?? null;
      const restartSafe =
        incentiveBackend === "supabase" && m013 === true && !incentiveFallbackActive;
      return {
        ...base,
        backend:
          incentiveBackend === "supabase"
            ? "supabase"
            : incentiveBackend === "memory"
              ? "memory"
              : "unavailable",
        hydrationSource: "GET /api/incentives/*",
        migrationOk: m013,
        probeOk: m013,
        restartSafe,
        hardRefreshSafe: restartSafe,
        serverAuthoritative: restartSafe,
        fallbackActive: incentiveFallbackActive,
        risks: [
          ...(incentiveBackend === "memory"
            ? ["In-memory backend: data lost on server restart."]
            : []),
          ...(incentiveBackend === "unavailable"
            ? ["Persistence blocked; configure Supabase or dev memory flag."]
            : []),
          ...(m013 === false ? ["Migration 013 not applied."] : []),
        ],
        recommendedAction:
          incentiveBackend === "supabase"
            ? "Pilot OK: verify run persists after hard refresh."
            : "Apply migration 013; unset INCENTIVE_ALLOW_MEMORY_FALLBACK in staging.",
      };
    }
    case "incentive_presets": {
      const restartSafe =
        incentiveBackend === "supabase" && (probes?.migration013Ok ?? false);
      return {
        ...base,
        backend:
          incentiveBackend === "supabase"
            ? "supabase"
            : incentiveBackend === "memory"
              ? "memory"
              : "unavailable",
        hydrationSource: "GET/POST /api/incentives/presets",
        migrationOk: probes?.migration013Ok ?? null,
        probeOk: probes?.migration013Ok ?? null,
        restartSafe,
        hardRefreshSafe: restartSafe,
        serverAuthoritative: restartSafe,
        fallbackActive: incentiveFallbackActive,
        risks: incentiveBackend !== "supabase" ? ["Same backend as incentive plans."] : [],
        recommendedAction: "Align with incentive_plans_runs backend requirements.",
      };
    }
    case "incentive_compare_runs":
      return {
        ...base,
        backend: "ephemeral",
        hydrationSource: "React state",
        migrationOk: null,
        probeOk: null,
        restartSafe: false,
        hardRefreshSafe: false,
        serverAuthoritative: false,
        risks: ["Compare selections are not stored on server."],
        recommendedAction: "Re-select runs from History after refresh; persisted runs remain in DB.",
      };
    case "incentive_audit": {
      const restartSafe =
        incentiveBackend === "supabase" && (probes?.migration013Ok ?? false);
      return {
        ...base,
        backend: restartSafe ? "supabase" : incentiveBackend === "memory" ? "memory" : "unavailable",
        hydrationSource: "GET /api/incentives/audit",
        migrationOk: probes?.migration013Ok ?? null,
        probeOk: probes?.migration013Ok ?? null,
        restartSafe,
        hardRefreshSafe: restartSafe,
        serverAuthoritative: restartSafe,
        fallbackActive: incentiveFallbackActive,
        risks: [],
        recommendedAction: restartSafe
          ? "Audit entries persist with plan overrides."
          : "Enable Supabase incentive backend first.",
      };
    }
    default:
      return base;
  }
}

export function resolvePersistenceTruth(
  input: ResolvePersistenceTruthInput = {}
): PersistenceTruthReport {
  const snapshot = input.snapshot ?? buildPersistenceStatusSnapshot();
  const probes = input.serverProbes ?? null;
  const incentiveBackend = resolveIncentiveBackendKind(
    snapshot,
    input.incentiveMeta,
    probes
  );
  const incentiveFallbackActive = input.incentiveMeta?.fallbackActive ?? false;

  const domains = DOMAIN_META.map((meta) =>
    buildDomainRow(meta, snapshot, probes, incentiveBackend, incentiveFallbackActive)
  );

  const serverAuthoritativeCount = domains.filter((d) => d.serverAuthoritative).length;
  const localOrEphemeralCount = domains.filter(
    (d) =>
      d.backend === "localStorage" ||
      d.backend === "ephemeral" ||
      d.backend === "memory" ||
      !d.restartSafe
  ).length;

  const pilotVerdict =
    serverAuthoritativeCount >= 6
      ? `Server-authoritative: strong (${serverAuthoritativeCount}/${domains.length} domains)`
      : `Server-authoritative: partial (${serverAuthoritativeCount}/${domains.length} domains; ${localOrEphemeralCount} local/ephemeral/at-risk)`;

  return {
    generatedAt: new Date().toISOString(),
    persistMode: snapshot.persistMode,
    supabaseConfigured: snapshot.supabaseConfigured,
    tenantNamespaced: snapshot.tenantNamespaced,
    authSessionOk: probes?.authSessionOk ?? null,
    incentiveBackend,
    incentiveFallbackActive,
    migration013Ok: probes?.migration013Ok ?? null,
    domains,
    pilotVerdict,
    serverAuthoritativeCount,
    localOrEphemeralCount,
  };
}

export function getDomainRegistryMeta(): typeof DOMAIN_META {
  return DOMAIN_META;
}
