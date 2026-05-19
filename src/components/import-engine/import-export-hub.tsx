"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowRight,
  Building2,
  Briefcase,
  Coins,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ensureImportAdaptersRegistered } from "@/lib/import-engine/register-adapters";
import { getImportAdapter, listImportAdapters } from "@/lib/import-engine";

interface HubModuleMeta {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const META: HubModuleMeta[] = [
  {
    id: "hr-workforce",
    icon: Users,
    description:
      "Business units, departments, teams, roles + OH manual / non-workforce overhead lines + global settings.",
  },
  {
    id: "service-architecture",
    icon: Briefcase,
    description:
      "Service families, tiers, templates, delivery phases, role allocations and opportunity tier bands.",
  },
  {
    id: "sales-plan",
    icon: Building2,
    description:
      "Companies, revenue streams, opportunity tiers, scenarios and tier lines (respects governance).",
  },
  {
    id: "incentives",
    icon: Coins,
    description:
      "Incentive plans, layers, rules, scorecards and commission grids (respects payout freezes).",
  },
];

export function ImportExportHub() {
  const t = useTranslations("importEngine");
  const locale = useLocale();
  ensureImportAdaptersRegistered();

  const adapters = listImportAdapters();
  const knownIds = new Set(adapters.map((a) => a.id));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("hub.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("hub.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {META.map((m) => {
          const adapter = getImportAdapter(m.id);
          const available = knownIds.has(m.id);
          const Icon = m.icon;
          const dependencies = available && adapter ? adapter.checkDependencies() : [];
          const blocked = dependencies.some((d) => d.status === "missing");
          return (
            <Card
              key={m.id}
              className={
                available ? "transition-colors hover:border-primary/40" : "opacity-60"
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {adapter?.label ?? t(`modules.${m.id}.label`)}
                    </CardTitle>
                    <CardDescription>{m.description}</CardDescription>
                  </div>
                  {available ? (
                    blocked ? (
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {t("hub.dependencyMissing")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        {t("hub.ready")}
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline">{t("hub.comingSoon")}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {available ? (
                  <Link
                    href={`/${locale}/import-export/${m.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {t("hub.openWizard")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("hub.notYetAvailable")}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
