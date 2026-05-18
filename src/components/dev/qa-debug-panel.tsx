"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { buildPersistenceStatusSnapshot } from "@/lib/persistence/persistence-status";
import { getPlatformDebugSnapshot } from "@/lib/persistence/platform-persistence-debug";
import { useIncentivePlanStore } from "@/stores/use-incentive-plan-store";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";
import { PersistenceTruthPanel } from "@/components/dev/persistence-truth-panel";
import { usePersistenceTruth } from "@/hooks/use-persistence-truth";
import { useNumericReconciliation } from "@/hooks/use-numeric-reconciliation";
import { Badge } from "@/components/ui/badge";

type TabId = "truth" | "session" | "reconciliation" | "errors";

export function QaDebugPanel({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(embedded);
  const [tab, setTab] = useState<TabId>("truth");
  const [devStatus, setDevStatus] = useState<Record<string, unknown> | null>(null);
  const tenant = useTenantPersistenceContext();
  const { data: truthPayload, loading: truthLoading, refresh: refreshTruth } =
    usePersistenceTruth(isQaInstrumentationEnabled() && open);
  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const selectedCompanyId = useWorkspaceStore((s) => s.selectedCompanyId);
  const persistenceMeta = useIncentivePlanStore((s) => s.persistenceMeta);
  const lastPersistError = useIncentivePlanStore((s) => s.lastPersistError);
  const latestRunSnapshot = useIncentivePlanStore((s) => s.runs[0]?.snapshot ?? null);

  const reconciliation = useNumericReconciliation({
    salesPlanModel: null,
    executiveMeasures: null,
    wizardNpTargetPct: null,
    wizardBlendedCm: null,
    incentiveSnapshot: latestRunSnapshot,
    forecastProjectedPoolSar: null,
    forecastAttainmentPct: null,
  });

  useEffect(() => {
    if (!isQaInstrumentationEnabled() || !open) return;
    void fetch("/api/dev/persistence-status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setDevStatus)
      .catch(() => setDevStatus(null));
  }, [open]);

  if (!isQaInstrumentationEnabled()) return null;

  const platform = getPlatformDebugSnapshot();
  const persist = buildPersistenceStatusSnapshot();
  const scenarioError = platform?.lastScenarioPersistError;

  const tabs: { id: TabId; label: string }[] = [
    { id: "truth", label: "Truth" },
    { id: "session", label: "Session" },
    { id: "reconciliation", label: "Drift" },
    { id: "errors", label: "Errors" },
  ];

  const panelBody = open ? (
        <div className="mt-2 max-h-[75vh] overflow-auto rounded-lg border border-border bg-card p-3 text-[11px] shadow-xl">
          <div className="mb-2 flex flex-wrap gap-1">
            {tabs.map((t) => (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={tab === t.id ? "default" : "ghost"}
                className="h-7 px-2 text-[10px]"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {tab === "truth" ? (
            <>
              <PersistenceTruthPanel
                report={truthPayload?.report ?? null}
                durabilityChecklist={truthPayload?.durabilityChecklist ?? []}
                loading={truthLoading}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2 h-7 text-[10px]"
                onClick={() => void refreshTruth()}
              >
                Refresh probes
              </Button>
            </>
          ) : null}

          {tab === "session" ? (
            <>
              <Section title="Persistence">
                <Row k="mode" v={persist.persistMode} />
                <Row k="supabase" v={String(persist.supabaseConfigured)} />
                <Row k="incentive hint" v={persist.incentiveBackendHint} />
                <Row k="memory fallback env" v={String(persist.incentiveFallbackAllowed)} />
                {devStatus ? (
                  <>
                    <Row k="server backend" v={String(devStatus.incentiveBackend)} />
                    <Row k="migration 013" v={String(devStatus.migration013Ok)} />
                  </>
                ) : null}
                {persistenceMeta ? (
                  <Row
                    k="API meta"
                    v={`${persistenceMeta.persistenceBackend}${persistenceMeta.fallbackActive ? " (fallback)" : ""}`}
                  />
                ) : null}
              </Section>
              <Section title="Tenant">
                <Row k="org" v={tenant.organizationId ?? "—"} />
                <Row k="hydrating" v={String(tenant.isHydratingEconomics)} />
                <Row k="company" v={selectedCompanyId ?? "—"} />
                <Row k="scenario" v={selectedScenarioId ?? "—"} />
              </Section>
              <Section title="Bootstrap">
                <Row
                  k="workspace hydrated"
                  v={String(tenant.workspaceBootstrap?.workspaceHydrated ?? false)}
                />
                <Row
                  k="errors"
                  v={
                    tenant.workspaceBootstrap?.errors?.length
                      ? tenant.workspaceBootstrap.errors.join("; ")
                      : "none"
                  }
                />
                <Row k="auth required" v={String(tenant.workspaceBootstrap?.authRequired ?? false)} />
              </Section>
              <Section title="Hydration order">
                <pre className="whitespace-pre-wrap break-all text-[10px]">
                  {(platform?.hydrationOrder ?? []).join("\n") || "—"}
                </pre>
              </Section>
            </>
          ) : null}

          {tab === "reconciliation" ? (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Compares Sales Plan, Executive measures, and incentive run when inputs are
                available on this route. Open Sales Plan or run incentives for fuller drift.
              </p>
              {reconciliation.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No comparable measures yet.</p>
              ) : (
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-1 pe-1">Check</th>
                      <th className="pb-1 pe-1">Severity</th>
                      <th className="pb-1 pe-1">Category</th>
                      <th className="pb-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/40 align-top">
                        <td className="py-1.5 pe-1 font-medium">{item.label}</td>
                        <td className="py-1.5 pe-1">
                          <Badge
                            variant={item.severity === "warning" ? "destructive" : "secondary"}
                            className="text-[9px]"
                          >
                            {item.severity}
                          </Badge>
                        </td>
                        <td className="py-1.5 pe-1 font-mono text-[9px]">{item.category}</td>
                        <td className="py-1.5 text-muted-foreground">{item.recommendedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}

          {tab === "errors" ? (
            <>
              {truthPayload?.probes.probeErrors?.length ? (
                <Section title="Probe errors">
                  <ul className="list-inside list-disc text-destructive">
                    {truthPayload.probes.probeErrors.map((e) => (
                      <li key={e} className="break-all text-[10px]">
                        {e}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
              {lastPersistError ? (
                <Section title="Incentive persist error">
                  <pre className="whitespace-pre-wrap break-all text-destructive">
                    {JSON.stringify(lastPersistError, null, 2)}
                  </pre>
                </Section>
              ) : (
                <p className="text-xs text-muted-foreground">No incentive persist errors.</p>
              )}
              {scenarioError ? (
                <Section title="Scenario persist error">
                  <pre className="whitespace-pre-wrap break-all text-destructive">
                    {JSON.stringify(scenarioError, null, 2)}
                  </pre>
                </Section>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No scenario persist errors.</p>
              )}
            </>
          ) : null}
        </div>
      ) : null;

  if (embedded) {
    return <div className="w-full">{panelBody}</div>;
  }

  return (
    <div className="fixed bottom-4 end-4 z-50 w-[min(480px,calc(100vw-2rem))]">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full justify-between shadow-lg"
        onClick={() => setOpen((o) => !o)}
      >
        QA / Debug
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </Button>
      {panelBody}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 border-b border-border/50 pb-2 last:border-0">
      <p className="mb-1 font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="max-w-[60%] truncate text-end font-mono">{v}</span>
    </div>
  );
}
