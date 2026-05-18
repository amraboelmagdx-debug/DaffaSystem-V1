"use client";

import { useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  Layers,
  LayoutDashboard,
  Target,
  Trophy,
  Users2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useWorkspaceStore, scenariosForCompany, streamsForCompany } from "@/stores/use-workspace-store";
import { useActivePlanningInputs } from "@/hooks/use-active-planning-inputs";
import { useEconomicsGraph } from "@/hooks/use-economics-graph";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";

const PORTAL_LINKS = [
  { href: "/hr-workforce", key: "hr", icon: Users2 },
  { href: "/service-architecture", key: "serviceArchitecture", icon: Layers },
  {
    href: "/service-architecture/commercial-pricing",
    key: "calculator",
    icon: Calculator,
  },
  { href: "/", key: "executive", icon: LayoutDashboard },
  { href: "/sales-plan", key: "salesPlan", icon: Target },
  { href: "/sales-incentives", key: "incentives", icon: Trophy },
] as const;

type Props = {
  companyId: string;
};

export function UnitPortal({ companyId }: Props) {
  const t = useTranslations("holding.unitPortal");
  const locale = useLocale();
  const { linkedUnits, setCompany, isReady } = useOperationalWorkspace();
  const unit = linkedUnits.find((c) => c.id === companyId);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const hrBu = useHrWorkforceStore((s) =>
    unit?.hrBusinessUnitId
      ? s.businessUnits.find((b) => b.id === unit.hrBusinessUnitId)
      : undefined
  );

  const { company, tierLineOverrides } = useActivePlanningInputs(companyId);
  const scenarios = company ? scenariosForCompany(company.id) : [];
  const streams = company ? streamsForCompany(company.id) : [];

  const evaluation = useEconomicsGraph({
    company,
    streams,
    opportunities,
    scenarios,
    selectedScenarioId,
    tierLineOverrides,
    scenarioBundles,
  });

  useEffect(() => {
    if (companyId) setCompany(companyId);
  }, [companyId, setCompany]);

  const fmt = (n: number) => formatCurrencyLocale(n, locale);

  const kpis = useMemo(() => {
    if (evaluation.phase !== "ready") return null;
    const m = evaluation.measures;
    return {
      revenue: m.valuesByMeasureId[MEASURE_ID.BU_REVENUE_SCENARIO_MONTHLY] ?? m.activeEngine.revenue,
      netProfit:
        m.valuesByMeasureId[MEASURE_ID.BU_NET_PROFIT_SCENARIO_MONTHLY] ??
        m.activeEngine.netProfit,
      roi: m.valuesByMeasureId[MEASURE_ID.BU_ROI_SCENARIO_ON_FIXED] ?? m.activeEngine.roi,
    };
  }, [evaluation]);

  if (!isReady) {
    return <OperationalWorkspaceGate>{null}</OperationalWorkspaceGate>;
  }

  if (!unit) {
    notFound();
  }

  const displayName = hrBu?.name ?? unit.name;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="gap-1 -ms-2" asChild>
            <Link href="/holding">
              <ArrowLeft className="h-4 w-4" />
              {t("backToHolding")}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{t("purpose")}</p>
        </div>
      </div>

      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard title={t("revenue")} value={fmt(kpis.revenue)} explanation="" />
          <KpiCard title={t("netProfit")} value={fmt(kpis.netProfit)} explanation="" />
          <KpiCard title={t("roi")} value={formatPct(kpis.roi)} explanation="" />
        </div>
      ) : (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="py-6 text-sm text-muted-foreground">{t("kpisBlocked")}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PORTAL_LINKS.map(({ href, key, icon: Icon }) => (
          <Link key={key} href={href}>
            <Card className="h-full border-border/60 bg-card/60 backdrop-blur transition-colors hover:border-primary/30 hover:bg-card/80">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{t(`links.${key}`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{t(`linksDesc.${key}`)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
