"use client";

import type { IncentiveOperationalWarning } from "@/types/incentives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function IncentiveWarningsPanel({
  warnings,
  title,
}: {
  warnings: IncentiveOperationalWarning[];
  title: string;
}) {
  if (!warnings.length) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.map((w, i) => (
          <div key={`${w.code}-${i}`} className="rounded-md border border-border/50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  w.severity === "critical"
                    ? "destructive"
                    : w.severity === "warn"
                      ? "secondary"
                      : "outline"
                }
              >
                {w.code}
              </Badge>
              <span>{w.message}</span>
            </div>
            {Object.keys(w.explainInputs).length ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {Object.entries(w.explainInputs)
                  .map(([k, v]) => `${k}=${String(v)}`)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
