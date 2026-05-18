"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OxExpandDiagnostics } from "@/components/ox/ox-expand-diagnostics";
import { PersistenceTruthPanel } from "@/components/dev/persistence-truth-panel";
import { buildPersistenceStatusSnapshot } from "@/lib/persistence/persistence-status";
import { usePersistenceTruth } from "@/hooks/use-persistence-truth";

export function PersistenceDataHealthCard() {
  const t = useTranslations("ox");
  const status = buildPersistenceStatusSnapshot();
  const { data, loading } = usePersistenceTruth(true);

  const headline =
    data?.report.pilotVerdict ??
    (loading ? t("dataHealth.loading") : t("dataHealth.unavailable"));

  const detailLines: string[] = [];
  if (status.supabaseConfigured && status.persistMode === "local_only") {
    detailLines.push(t("dataHealth.localOnlyWithSupabase"));
  }
  if (status.incentiveBackendHint === "memory") {
    detailLines.push(t("dataHealth.incentiveMemory"));
  }
  if (status.incentiveBackendHint === "unavailable") {
    detailLines.push(t("dataHealth.incentiveUnavailable"));
  }

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">{t("dataHealth.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-foreground">{headline}</p>
        {detailLines.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {detailLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <OxExpandDiagnostics title={t("dataHealth.technicalDetails")}>
          <PersistenceTruthPanel
            report={data?.report ?? null}
            durabilityChecklist={data?.durabilityChecklist ?? []}
            loading={loading}
          />
        </OxExpandDiagnostics>
      </CardContent>
    </Card>
  );
}
