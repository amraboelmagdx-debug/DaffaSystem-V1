"use client";

import { useTranslations } from "next-intl";
import type { IncentiveDealInput } from "@/types/incentives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function IncentiveTierExplainPanel({ deals }: { deals: IncentiveDealInput[] }) {
  const t = useTranslations("incentives");
  const withResolution = deals.filter((d) => d.tierResolution?.summary);

  if (!withResolution.length) {
    return (
      <p className="text-sm text-muted-foreground">{t("tierExplainEmpty")}</p>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{t("tierResolutionTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-64 space-y-3 overflow-y-auto text-sm">
        {withResolution.map((d) => (
          <div
            key={d.id}
            className="rounded-md border border-border/50 bg-muted/10 p-3"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium">{d.label}</span>
              <Badge variant="secondary" className="capitalize">
                {d.tierKey}
              </Badge>
              {d.tierResolution?.scope ? (
                <Badge variant="outline" className="text-[10px]">
                  {d.tierResolution.scope}
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground">{d.tierResolution?.summary}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
