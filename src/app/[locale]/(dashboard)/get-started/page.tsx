"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperatorPageShell } from "@/components/ox/operator-page-shell";
import { WorkflowProgressRail } from "@/components/ox/workflow-progress-rail";
import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { loadAllSampleData } from "@/lib/sample-data/orchestrator";
import { isSampleDataUxEnabled } from "@/lib/ox/sample-data-access";
import { CheckCircle2, Circle } from "lucide-react";

export default function GetStartedPage() {
  const t = useTranslations("ox.getStarted");
  const router = useRouter();
  const { organizationId } = useTenantPersistenceContext();
  const { linkedUnits, hrActiveBuCount, retryWorkspaceBootstrap } = useOperationalWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { done: Boolean(organizationId), label: t("stepOrg") },
    { done: hrActiveBuCount > 0, label: t("stepHr") },
    { done: linkedUnits.length > 0, label: t("stepSync") },
  ];

  const loadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await loadAllSampleData();
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        setError(failed.map((f) => `${f.moduleId}: ${f.reason ?? "failed"}`).join(" · "));
        return;
      }
      await retryWorkspaceBootstrap();
      router.push("/holding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OperatorPageShell
      routeContext="get-started"
      title={t("title")}
      purpose={t("subtitle")}
      mode="author"
      showWorkflowRail
    >
      <div className="mx-auto max-w-2xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("welcomeTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t("welcomeBody")}</p>
            <WorkflowProgressRail />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                {s.label}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/holding">{t("importHr")}</Link>
          </Button>
          {isSampleDataUxEnabled() ? (
            <Button variant="secondary" disabled={loading} onClick={() => void loadSample()}>
              {loading ? t("loadingSample") : t("loadSample")}
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link href="/holding">{t("goExecutive")}</Link>
          </Button>
        </div>
        {isSampleDataUxEnabled() ? (
          <p className="text-xs text-muted-foreground">{t("loadSampleDesc")}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </OperatorPageShell>
  );
}
