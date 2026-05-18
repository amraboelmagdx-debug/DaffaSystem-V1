"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { runSampleDataAction } from "@/lib/sample-data/orchestrator";
import type { SampleDataAction, SampleDataModuleId } from "@/lib/sample-data/types";
import { SAMPLE_PACK_ID } from "@/lib/sample-data/types";
import { isSampleDataUxEnabled } from "@/lib/ox/sample-data-access";

const MODULES_HIDDEN_WHEN_LINKED: SampleDataModuleId[] = [
  "workspace",
  "service-architecture",
  "sales-plan-wizard",
];

const MODULE_LABEL_KEYS: Record<SampleDataModuleId, string> = {
  "hr-workforce": "hrWorkforce",
  "service-architecture": "serviceArchitecture",
  workspace: "workspace",
  "sales-plan-wizard": "salesPlanWizard",
  "commercial-pricing-prefs": "commercialPricingPrefs",
  "service-cost-simulation-prefs": "serviceCostSimulationPrefs",
  "incentives-default-v1": "incentivesDefault",
};

type Props = {
  moduleId: SampleDataModuleId;
  className?: string;
};

export function SampleDataPanel({ moduleId, className }: Props) {
  const { linkedUnits } = useOperationalWorkspace();
  const t = useTranslations("sampleData");
  const labelKey = MODULE_LABEL_KEYS[moduleId];
  const [busy, setBusy] = useState<SampleDataAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hidden =
    MODULES_HIDDEN_WHEN_LINKED.includes(moduleId) &&
    linkedUnits.length > 0 &&
    !isSampleDataUxEnabled();

  const run = useCallback(
    async (action: SampleDataAction) => {
      const confirmKey =
        action === "clear" ? "confirmClear" : action === "reset" ? "confirmReset" : "confirmLoad";
      if (!window.confirm(t(confirmKey))) return;

      setBusy(action);
      setMessage(null);
      setError(null);
      try {
        const result = await runSampleDataAction(moduleId, action);
        if (result.ok) {
          setMessage(result.message ?? t(`success_${action}`));
        } else {
          const reasonKey = `error_${result.reason}` as "sampleData.error_unknown";
          setError(
            result.reason && t.has(reasonKey) ? t(reasonKey) : t("error_unknown")
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("error_unknown"));
      } finally {
        setBusy(null);
      }
    },
    [moduleId, t]
  );

  if (hidden) {
    return null;
  }

  return (
    <Card className={className ?? "border-muted/60 bg-muted/20"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t(`modules.${labelKey}.title`)}</CardTitle>
        <CardDescription>
          {t(`modules.${labelKey}.description`)} · {t("packLabel", { pack: SAMPLE_PACK_ID })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SampleDataActionButtons busy={busy} onRun={run} t={t} />
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <p className="text-xs text-muted-foreground">{t("tenantNote")}</p>
      </CardContent>
    </Card>
  );
}

function SampleDataActionButtons({
  busy,
  onRun,
  t,
}: {
  busy: SampleDataAction | null;
  onRun: (action: SampleDataAction) => void;
  t: ReturnType<typeof useTranslations<"sampleData">>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy !== null}
        onClick={() => void onRun("load")}
      >
        {busy === "load" ? t("working") : t("loadSample")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy !== null}
        onClick={() => void onRun("clear")}
      >
        {busy === "clear" ? t("working") : t("clearData")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy !== null}
        onClick={() => void onRun("reset")}
      >
        {busy === "reset" ? t("working") : t("resetSample")}
      </Button>
    </div>
  );
}
