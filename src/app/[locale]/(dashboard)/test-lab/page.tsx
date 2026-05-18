"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperatorPageShell } from "@/components/ox/operator-page-shell";
import { WORKFLOW_STEPS } from "@/lib/ox/workflow-steps";
import { clearAllSampleData, loadAllSampleData } from "@/lib/sample-data/orchestrator";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";
import { isSampleDataUxEnabled } from "@/lib/ox/sample-data-access";
import { CheckCircle2 } from "lucide-react";

const TEST_SEQUENCE: { step: number; labelKey: string; href: string }[] = [
  { step: 1, labelKey: "workflow.setup", href: "/settings" },
  { step: 2, labelKey: "workflow.structure", href: "/hr-workforce/import" },
  { step: 3, labelKey: "workflow.planStep", href: "/sales-plan" },
  { step: 4, labelKey: "workflow.monitorStep", href: "/" },
  { step: 5, labelKey: "workflow.incentives", href: "/sales-incentives" },
];

export default function TestLabPage() {
  const t = useTranslations("ox");
  const tTest = useTranslations("ox.testLab");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetDemo = async () => {
    if (!window.confirm("Clear all sample modules?")) return;
    setBusy(true);
    try {
      await clearAllSampleData();
      if (isSampleDataUxEnabled()) {
        await loadAllSampleData();
      }
      setMessage("Demo environment reset.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OperatorPageShell
      routeContext="test-lab"
      title={tTest("title")}
      purpose={tTest("subtitle")}
      mode="diagnose"
      showWorkflowRail
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{tTest("checklistTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TEST_SEQUENCE.map((item) => (
              <div
                key={item.href}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/50 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {item.step}. {t(item.labelKey as never)}
                  </span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={item.href}>Open</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {isSampleDataUxEnabled() ? (
              <Button variant="secondary" disabled={busy} onClick={() => void resetDemo()}>
                {tTest("resetDemo")}
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/get-started">{t("breadcrumbs.getStarted")}</Link>
            </Button>
            {isQaInstrumentationEnabled() ? (
              <Button variant="outline" asChild>
                <Link href="/settings">{tTest("openQa")}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Full journey: {WORKFLOW_STEPS.length} operational steps in the workflow rail.
        </p>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </OperatorPageShell>
  );
}
