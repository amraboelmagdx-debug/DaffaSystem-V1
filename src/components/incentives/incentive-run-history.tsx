"use client";

import { useTranslations } from "next-intl";
import type { IncentiveRunRecord } from "@/types/incentives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/calculations/engine";

export function IncentiveRunHistory({
  runs,
  selectedRunId,
  onSelectRun,
  showSuperseded,
  onShowSupersededChange,
}: {
  runs: IncentiveRunRecord[];
  selectedRunId?: string | null;
  onSelectRun: (id: string) => void;
  showSuperseded?: boolean;
  onShowSupersededChange?: (show: boolean) => void;
}) {
  const t = useTranslations("incentives");
  const fmt = (n: number) => formatCurrency(n, "SAR");

  if (!runs.length) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-6 text-sm text-muted-foreground">
          {t("historyEmpty")}
        </CardContent>
      </Card>
    );
  }

  const supersededOf = (runId: string) =>
    runs.find((r) => r.supersedesRunId === runId)?.id;

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
        {onShowSupersededChange ? (
          <div className="flex items-center gap-2">
            <input
              id="show-superseded"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border border-input"
              checked={showSuperseded}
              onChange={(e) => onShowSupersededChange(e.target.checked)}
            />
            <Label htmlFor="show-superseded" className="text-xs font-normal">
              {t("showSupersededRuns")}
            </Label>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="max-h-64 space-y-2 overflow-y-auto text-sm">
        {runs.map((r) => {
          const childId = supersededOf(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRun(r.id)}
              className={`flex w-full flex-col gap-1 rounded-md border px-2 py-2 text-left ${
                selectedRunId === r.id ? "border-primary bg-muted/40" : "border-border/50"
              } ${r.runLifecycle === "superseded" ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px]">{r.id.slice(0, 12)}…</span>
                <Badge variant="outline">{r.mode}</Badge>
                <span>{fmt(r.snapshot.companyTotalSar)}</span>
                <Badge
                  variant={r.runLifecycle === "superseded" ? "secondary" : "default"}
                >
                  {r.runLifecycle ?? "draft_run"}
                </Badge>
              </div>
              {r.supersedesRunId ? (
                <p className="text-[10px] text-muted-foreground">
                  {t("supersedesRun", { id: r.supersedesRunId.slice(0, 8) })}
                </p>
              ) : null}
              {childId ? (
                <p className="text-[10px] text-muted-foreground">
                  {t("supersededByRun", { id: childId.slice(0, 8) })}
                </p>
              ) : null}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
