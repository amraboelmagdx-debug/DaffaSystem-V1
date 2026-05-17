"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearAllSampleData, loadAllSampleData } from "@/lib/sample-data/orchestrator";

export function PlatformSampleDataControls() {
  const t = useTranslations("sampleData");
  const [busy, setBusy] = useState<"load" | "clear" | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const runAll = async (action: "load" | "clear") => {
    const confirmKey = action === "load" ? "confirmLoadAll" : "confirmClearAll";
    if (!window.confirm(t(confirmKey))) return;
    setBusy(action);
    setSummary(null);
    try {
      const results = action === "load" ? await loadAllSampleData() : await clearAllSampleData();
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        setSummary(
          failed.map((f) => `${f.moduleId}: ${f.reason ?? "failed"}`).join(" · ")
        );
      } else {
        setSummary(t(action === "load" ? "success_loadAll" : "success_clearAll"));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">{t("platformTitle")}</CardTitle>
        <CardDescription>{t("platformDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy !== null}
          onClick={() => void runAll("load")}
        >
          {busy === "load" ? t("working") : t("loadAll")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void runAll("clear")}
        >
          {busy === "clear" ? t("working") : t("clearAll")}
        </Button>
        {summary ? <p className="w-full text-sm text-muted-foreground">{summary}</p> : null}
      </CardContent>
    </Card>
  );
}
