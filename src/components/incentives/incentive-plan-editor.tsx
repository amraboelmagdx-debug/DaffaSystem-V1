"use client";

import { useTranslations } from "next-intl";
import type { IncentivePlan } from "@/types/incentives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function IncentivePlanEditor({
  plan,
  onApprove,
  onArchive,
  periodFrozen,
}: {
  plan: IncentivePlan;
  onApprove?: () => void;
  onArchive?: () => void;
  periodFrozen?: boolean;
}) {
  const t = useTranslations("incentives");

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">{t("planEditor")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {periodFrozen ? (
            <Badge variant="destructive">{t("periodFrozen")}</Badge>
          ) : null}
          <Badge variant="outline">{plan.governance?.status ?? plan.status}</Badge>
          {onApprove && plan.status !== "approved" ? (
            <button
              type="button"
              className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
              onClick={onApprove}
            >
              {t("approvePlan")}
            </button>
          ) : null}
          {onArchive && plan.status !== "archived" ? (
            <button
              type="button"
              className="rounded-md border border-input px-2 py-1 text-xs"
              onClick={onArchive}
            >
              {t("archivePlan")}
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="layers">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="layers">{t("tabLayers")}</TabsTrigger>
            <TabsTrigger value="rules">{t("tabRules")}</TabsTrigger>
            <TabsTrigger value="scorecard">{t("tabScorecard")}</TabsTrigger>
            <TabsTrigger value="governance">{t("tabGovernance")}</TabsTrigger>
          </TabsList>
          <TabsContent value="layers" className="mt-4 space-y-2 text-sm">
            {plan.layers.map((l) => (
              <div key={l.id} className="flex justify-between border-b border-border/40 py-1">
                <span>{l.label}</span>
                <span>{l.defaultSplitPct}%</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {t("reservePct", { pct: plan.reservePct })}
            </p>
          </TabsContent>
          <TabsContent value="rules" className="mt-4 space-y-2 text-sm">
            {plan.rules.map((r) => (
              <div key={r.id} className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span>
                  {r.tierKey} · {r.rateType}
                </span>
                <span>{(r.rateValue * 100).toFixed(1)}%</span>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="scorecard" className="mt-4 space-y-2 text-sm">
            {plan.scorecard.components.map((c) => (
              <div key={c.id} className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span>{t(`score.${c.componentKey}`)}</span>
                <span>
                  w={(c.weight * 100).toFixed(0)}% · target={c.targetValue}
                </span>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="governance" className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>{t("governanceRevision", { rev: plan.governance?.revision ?? plan.revision })}</p>
            <p>{t("governanceOwner", { owner: plan.governance?.owner ?? "—" })}</p>
            {plan.approvedAt ? (
              <p>{t("governanceApproved", { at: plan.approvedAt })}</p>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
