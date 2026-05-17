"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Target, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { SalesPlanCharts } from "@/components/sales-plan/sales-plan-charts";
import { AdvancedEnterprisePanel } from "@/components/sales-plan/advanced-enterprise-panel";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";
import {
  buildSalesPlanModel,
  type PlanningInsight,
  type PlanningInsightId,
  type SalesPlanModel,
  type ServiceRollup,
  type TierRollupRow,
} from "@/lib/sales-plan/build-model";
import {
  breakEvenRevenue,
  requiredAwardsFromRevenue,
  sumMonthlyFixedCosts,
  weightedBlendedCm,
  yearlyBurnFromMonthly,
} from "@/lib/sales-plan/engine";
import { cn } from "@/lib/utils";
import { OperationalBuToolbar } from "@/components/operational-workspace/operational-bu-toolbar";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { streamsForCompany } from "@/stores/use-workspace-store";
import { useSalesPlanWizardStore } from "@/stores/use-sales-plan-wizard-store";
import type { OpportunityTierKey } from "@/types/sales-plan";

const TIER_KEYS: OpportunityTierKey[] = ["tiny", "standard", "big", "mega"];

const WIZARD_STEP_TITLE_KEYS = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
  "s9",
  "s10",
  "s11",
  "s12",
  "s13",
  "s14",
  "s15",
  "s16",
  "s17",
  "s18",
] as const;

type WizardStepTitleKey = (typeof WIZARD_STEP_TITLE_KEYS)[number];

type InsightTranslationKey = `insights.${PlanningInsightId}`;
type SegmentRevenueRow = SalesPlanModel["segmentRevenue"][number];

export function SalesPlanWizard() {
  const t = useTranslations("salesPlan");
  const locale = useLocale();
  const fmt = (n: number, currency?: string) =>
    formatCurrencyLocale(n, locale, currency ?? "SAR");

  const { selectedUnit, isReady } = useOperationalWorkspace();
  const company = selectedUnit;
  const demoStreams = company ? streamsForCompany(company.id) : [];

  const wizard = useSalesPlanWizardStore();
  const savePlanToWorkspaceAsNewCompany = useSalesPlanWizardStore((s) => s.savePlanToWorkspaceAsNewCompany);
  const [saveFeedback, setSaveFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const hydrateOpportunityTiersFromWorkspaceCompany = useSalesPlanWizardStore(
    (s) => s.hydrateOpportunityTiersFromWorkspaceCompany
  );
  const seedProductsFromStreams = useSalesPlanWizardStore((s) => s.seedProductsFromStreams);
  const wizardProducts = useSalesPlanWizardStore((s) => s.products);
  const lastHydratedCompanyId = useRef<string | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    if (lastHydratedCompanyId.current === company.id) return;
    lastHydratedCompanyId.current = company.id;
    hydrateOpportunityTiersFromWorkspaceCompany();
  }, [company?.id, hydrateOpportunityTiersFromWorkspaceCompany]);

  useEffect(() => {
    if (!company?.id || demoStreams.length === 0) return;
    if (wizardProducts.length > 0) return;
    seedProductsFromStreams(demoStreams.map((s) => ({ id: s.id, name: s.name })));
  }, [company?.id, demoStreams, wizardProducts.length, seedProductsFromStreams]);

  const totalFixed = useMemo(
    () => sumMonthlyFixedCosts(wizard.fixedCostLines),
    [wizard.fixedCostLines]
  );

  const serviceWeights = useMemo(() => {
    return wizard.products.map((p) => ({
      serviceId: p.id,
      weight: Math.max(0, wizard.serviceRevenueShare[p.id] ?? 0),
    }));
  }, [wizard.products, wizard.serviceRevenueShare]);

  const engineCells = useMemo(() => {
    const rows: {
      serviceId: string;
      tierKey: OpportunityTierKey;
      exists: boolean;
      cm: number;
      mix: number;
      adv: number;
    }[] = [];
    for (const p of wizard.products) {
      for (const tk of TIER_KEYS) {
        const cell = wizard.contributionCells[`${p.id}:${tk}`];
        const mix = wizard.tierMixByService[p.id]?.[tk] ?? 0;
        if (!cell) continue;
        rows.push({
          serviceId: p.id,
          tierKey: tk,
          exists: cell.exists,
          cm: cell.contributionMarginPct,
          mix,
          adv: cell.avgDealValueSar,
        });
      }
    }
    return rows;
  }, [wizard.products, wizard.contributionCells, wizard.tierMixByService]);

  const blended = useMemo(() => {
    if (wizard.blendedCmOverride != null) return wizard.blendedCmOverride;
    return weightedBlendedCm({
      serviceWeights,
      cells: engineCells,
    });
  }, [wizard.blendedCmOverride, serviceWeights, engineCells]);

  const breakEvenMonthly = useMemo(
    () => breakEvenRevenue(totalFixed, blended),
    [totalFixed, blended]
  );

  const segmentSum = useMemo(
    () => wizard.marketSegments.reduce((s, m) => s + m.targetPct, 0),
    [wizard.marketSegments]
  );

  const model = useMemo(
    () =>
      buildSalesPlanModel({
        products: wizard.products,
        serviceRevenueShare: wizard.serviceRevenueShare,
        tierMixByService: wizard.tierMixByService,
        contributionCells: wizard.contributionCells,
        fixedMonthly: totalFixed,
        blendedCm: blended,
        npTargetPct: wizard.npTargetPct,
        conversionRates: wizard.conversionRates,
        quarterlyWeights: wizard.quarterlyWeights,
        marketSegments: wizard.marketSegments,
      }),
    [
      wizard.products,
      wizard.serviceRevenueShare,
      wizard.tierMixByService,
      wizard.contributionCells,
      totalFixed,
      blended,
      wizard.npTargetPct,
      wizard.conversionRates,
      wizard.quarterlyWeights,
      wizard.marketSegments,
    ]
  );

  const shareSum = useMemo(
    () => wizard.products.reduce((s, p) => s + (wizard.serviceRevenueShare[p.id] ?? 0), 0),
    [wizard.products, wizard.serviceRevenueShare]
  );

  const go = (d: number) => wizard.setStep(wizard.currentStep + d);

  if (!isReady) {
    return <OperationalWorkspaceGate>{null}</OperationalWorkspaceGate>;
  }

  if (!company) {
    return (
      <OperationalWorkspaceGate>
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <p className="text-sm font-medium text-foreground">{t("noWorkspaceCompany")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("noWorkspaceCompanyHint")}</p>
        </div>
      </OperationalWorkspaceGate>
    );
  }

  return (
    <OperationalWorkspaceGate>
    <div className="mx-auto max-w-6xl space-y-6 pb-28">
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/60",
          "bg-gradient-to-br from-violet-500/[0.07] via-card/95 to-fuchsia-500/[0.05]",
          "p-6 shadow-sm sm:p-8"
        )}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <header className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {t("badge")}
              </Badge>
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:leading-[1.15]">
              {t("title")}
            </h1>
            <p className="text-pretty max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              {t("subtitle")}
            </p>
          </header>
          <div className="w-full shrink-0 space-y-3 border-t border-border/50 pt-6 lg:w-auto lg:max-w-md lg:border-s lg:border-t-0 lg:ps-8 lg:pt-0">
            <OperationalBuToolbar className="lg:items-end" selectClassName="lg:ms-auto" />
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="flex items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/5 px-2 py-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                    checked={wizard.showAdvancedEnterpriseUi ?? false}
                    onChange={(e) => wizard.setShowAdvancedEnterpriseUi(e.target.checked)}
                  />
                  {t("advanced.toggleLabel")}
                </label>
                <InsightBulb label={t("advanced.toggleBulbTitle")} description={t("advanced.toggleBulbBody")} />
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!wizard.meta.portfolioName?.trim() || wizard.products.length === 0}
                onClick={() => {
                  const ok = savePlanToWorkspaceAsNewCompany();
                  setSaveFeedback({
                    text: ok ? t("saveWorkspaceSuccess") : t("saveWorkspaceNeedName"),
                    ok,
                  });
                  window.setTimeout(() => setSaveFeedback(null), 6000);
                }}
              >
                {t("saveWorkspace")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => wizard.applyPlanToWorkspace()}
              >
                {t("applyWorkspace")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => wizard.normalizeMarketSegments()}>
                {t("normalizeSegments")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => wizard.normalizeAllTierMixes()}>
                {t("normalizeTierMixAll")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => wizard.resetWizard()}>
                {t("reset")}
              </Button>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground lg:text-end">
              <span className="font-medium text-foreground">{t("saveWorkspaceHint")}</span>
              <span className="mx-1 text-border">·</span>
              <span>{t("applyWorkspaceHint")}</span>
            </div>
            {saveFeedback ? (
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium lg:text-end",
                  saveFeedback.ok
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                )}
              >
                {saveFeedback.text}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
        {WIZARD_STEP_TITLE_KEYS.map((key: WizardStepTitleKey, i: number) => {
          const n = i + 1;
          const active = wizard.currentStep === n;
          return (
            <button
              key={key}
              type="button"
              onClick={() => wizard.setStep(n)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {n}. {t(`stepTitles.${key}`)}
            </button>
          );
        })}
      </div>

      {wizard.showAdvancedEnterpriseUi ? <AdvancedEnterprisePanel /> : null}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={wizard.currentStep <= 1}
          onClick={() => go(-1)}
        >
          <ChevronLeft className="me-1 h-4 w-4" />
          {t("back")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("stepOf", { current: wizard.currentStep, total: 18 })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={wizard.currentStep >= 18}
          onClick={() => go(1)}
        >
          {t("next")}
          <ChevronRight className="ms-1 h-4 w-4" />
        </Button>
      </div>

      {wizard.currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              {t("stepTitles.s1")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Label>{t("portfolioName")}</Label>
                <InsightBulb label={t("insight.portfolioTitle")} description={t("insight.portfolioBody")} />
              </div>
              <Input
                value={wizard.meta.portfolioName}
                onChange={(e) => wizard.setMeta({ portfolioName: e.target.value })}
                placeholder={t("portfolioPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>{t("planningYear")}</Label>
                <InsightBulb label={t("insight.yearTitle")} description={t("insight.yearBody")} />
              </div>
              <Input
                type="number"
                value={wizard.meta.planningYear}
                onChange={(e) =>
                  wizard.setMeta({ planningYear: Math.max(2000, Number(e.target.value) || 2026) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <Input
                value={wizard.meta.currency}
                onChange={(e) => wizard.setMeta({ currency: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("planningScenario")}</Label>
              <Input
                value={wizard.meta.planningScenarioName}
                onChange={(e) => wizard.setMeta({ planningScenarioName: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {t("stepTitles.s2")}
              <InsightBulb label={t("insight.tiersTitle")} description={t("insight.tiersBody")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">{t("opportunityTiersIntro")}</p>
            <p className="text-xs text-muted-foreground">{t("tierBandsCompanyHint")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => wizard.hydrateOpportunityTiersFromWorkspaceCompany()}
              >
                {t("reloadTierBandsFromWorkspace")}
              </Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {wizard.opportunityTiers.map((tier) => (
                <div
                  key={tier.key}
                  className="rounded-xl border border-border/70 bg-card/50 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{t(`tierNames.${tier.key}`)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("class")} {tier.classLabel} ·{" "}
                        {Number(tier.minValueSar ?? 0).toLocaleString()} –{" "}
                        {tier.maxValueSar == null
                          ? "∞"
                          : Number(tier.maxValueSar ?? 0).toLocaleString()}{" "}
                        {wizard.meta.currency}
                      </p>
                    </div>
                    <InsightBulb
                      label={t("insight.tierStrategicTitle")}
                      description={t(`tierPurpose.${tier.key}`)}
                    />
                  </div>
                  <Separator className="my-3" />
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("tierMinSar")}</Label>
                      <Input
                        className="mt-1 h-8"
                        type="number"
                        min={0}
                        value={Number(tier.minValueSar ?? 0)}
                        onChange={(e) =>
                          wizard.updateOpportunityTier(tier.key, {
                            minValueSar: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("tierMaxSar")}</Label>
                      <Input
                        className="mt-1 h-8"
                        type="number"
                        min={0}
                        value={tier.maxValueSar == null ? "" : Number(tier.maxValueSar)}
                        placeholder={tier.key === "mega" ? t("tierMaxUnboundedHint") : undefined}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (tier.key === "mega" && raw === "") {
                            wizard.updateOpportunityTier(tier.key, { maxValueSar: null });
                            return;
                          }
                          const n = Math.max(0, Number(raw) || 0);
                          const lo = Number(tier.minValueSar ?? 0);
                          wizard.updateOpportunityTier(tier.key, {
                            maxValueSar: Math.max(lo, n),
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">{t("cashFlowImpact")}</span>
                      <Input
                        className="mt-1 h-8"
                        type="number"
                        value={Math.round(tier.cashFlowImpact * 100)}
                        onChange={(e) =>
                          wizard.updateOpportunityTier(tier.key, {
                            cashFlowImpact: Math.min(100, Math.max(0, Number(e.target.value) / 100)),
                          })
                        }
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("growthImpact")}</span>
                      <Input
                        className="mt-1 h-8"
                        type="number"
                        value={Math.round(tier.growthImpact * 100)}
                        onChange={(e) =>
                          wizard.updateOpportunityTier(tier.key, {
                            growthImpact: Math.min(100, Math.max(0, Number(e.target.value) / 100)),
                          })
                        }
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("stabilityScore")}</span>
                      <Input
                        className="mt-1 h-8"
                        type="number"
                        value={Math.round(tier.stabilityScore * 100)}
                        onChange={(e) =>
                          wizard.updateOpportunityTier(tier.key, {
                            stabilityScore: Math.min(100, Math.max(0, Number(e.target.value) / 100)),
                          })
                        }
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("salesCycleDays")}</span>
                      <Input
                        className="mt-1 h-8"
                        type="number"
                        value={tier.expectedSalesCycleDays}
                        onChange={(e) =>
                          wizard.updateOpportunityTier(tier.key, {
                            expectedSalesCycleDays: Math.max(1, Number(e.target.value) || 30),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{t("operationalComplexity")}</span>
                      <Input
                        className="mt-1 h-8"
                        type="number"
                        min={1}
                        max={5}
                        value={tier.operationalComplexity}
                        onChange={(e) =>
                          wizard.updateOpportunityTier(tier.key, {
                            operationalComplexity: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              {t("stepTitles.s3")}
              <InsightBulb label={t("insight.fixedTitle")} description={t("insight.fixedBody")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => wizard.addCustomFixedLine()}>
                {t("addCustomCost")}
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="app-data-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>{t("costCategory")}</th>
                    <th className="text-end tabular-nums">{t("monthly")}</th>
                    <th className="text-end tabular-nums">{t("yearly")}</th>
                    <th>{t("recurring")}</th>
                  </tr>
                </thead>
                <tbody>
                  {wizard.fixedCostLines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        {line.categoryKey === "custom" ? (
                          <Input
                            className="h-8"
                            value={line.customLabel ?? ""}
                            onChange={(e) =>
                              wizard.updateFixedLine(line.id, { customLabel: e.target.value })
                            }
                          />
                        ) : (
                          <span>{t(`fixedCategories.${line.categoryKey}`)}</span>
                        )}
                      </td>
                      <td className="text-end">
                        <Input
                          className="ms-auto h-8 w-28"
                          type="number"
                          value={Math.round(line.amountMonthly)}
                          onChange={(e) =>
                            wizard.updateFixedLine(line.id, {
                              amountMonthly: Math.max(0, Number(e.target.value) || 0),
                              amountYearly: Math.max(0, Number(e.target.value) || 0) * 12,
                            })
                          }
                        />
                      </td>
                      <td className="text-end tabular-nums text-muted-foreground">
                        {fmt(line.amountMonthly * 12, wizard.meta.currency)}
                      </td>
                      <td>
                        <div className="flex h-8 items-center">
                          <input
                            type="checkbox"
                            checked={line.recurring}
                            onChange={(e) =>
                              wizard.updateFixedLine(line.id, { recurring: e.target.checked })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="text-xs text-muted-foreground">{t("totalFixedMonthly")}</p>
                <p className="text-lg font-semibold tabular-nums">{fmt(totalFixed, wizard.meta.currency)}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="text-xs text-muted-foreground">{t("yearlyBurn")}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {fmt(yearlyBurnFromMonthly(totalFixed), wizard.meta.currency)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="text-xs text-muted-foreground">{t("breakEvenMonthly")}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {fmt(breakEvenMonthly, wizard.meta.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s4")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => wizard.addProduct()}>
                {t("addService")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  wizard.seedProductsFromStreams(demoStreams.map((s) => ({ id: s.id, name: s.name })))
                }
              >
                {t("importStreams", { company: company.name })}
              </Button>
            </div>
            {wizard.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
            ) : (
              <div className="space-y-4">
                {wizard.products.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/60 bg-gradient-to-br from-card/80 to-muted/10 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-[160px] flex-1 space-y-1">
                            <Label className="text-xs">{t("product.name")}</Label>
                            <Input
                              className="h-9"
                              value={p.name}
                              onChange={(e) => wizard.updateProduct(p.id, { name: e.target.value })}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-rose-600"
                            onClick={() => wizard.removeProduct(p.id)}
                          >
                            {t("remove")}
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t("product.category")}</Label>
                            <Input
                              className="h-9"
                              value={p.category}
                              onChange={(e) => wizard.updateProduct(p.id, { category: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("product.deliveryType")}</Label>
                            <Select
                              value={p.deliveryType}
                              onValueChange={(v) =>
                                wizard.updateProduct(p.id, {
                                  deliveryType: v as "product" | "service" | "hybrid",
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="service">{t("product.delivery.service")}</SelectItem>
                                <SelectItem value="product">{t("product.delivery.product")}</SelectItem>
                                <SelectItem value="hybrid">{t("product.delivery.hybrid")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="w-full shrink-0 space-y-3 lg:w-72">
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {t("productDriversCapacityHint")}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs">{t("product.strategicImportance")}</Label>
                            <span className="tabular-nums text-xs font-medium text-foreground">
                              {(p.strategicImportance * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(p.strategicImportance * 100)}
                            onChange={(e) =>
                              wizard.updateProduct(p.id, {
                                strategicImportance: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full accent-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs">{t("product.operationalComplexity")}</Label>
                            <span className="tabular-nums text-xs font-medium text-foreground">
                              {p.operationalComplexity}/5
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={p.operationalComplexity}
                            onChange={(e) =>
                              wizard.updateProduct(p.id, {
                                operationalComplexity: Number(e.target.value),
                              })
                            }
                            className="w-full accent-fuchsia-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs">{t("product.scalabilityScore")}</Label>
                            <span className="tabular-nums text-xs font-medium text-foreground">
                              {(p.scalabilityScore * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(p.scalabilityScore * 100)}
                            onChange={(e) =>
                              wizard.updateProduct(p.id, {
                                scalabilityScore: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full accent-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("stepTitles.s5")}
              <InsightBulb label={t("insight.advTitle")} description={t("insight.advBody")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wizard.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("needProducts")}</p>
            ) : (
              wizard.products.map((p) => (
                <div key={p.id} className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {TIER_KEYS.map((tk) => {
                      const c = wizard.contributionCells[`${p.id}:${tk}`];
                      if (!c) return null;
                      return (
                        <div key={tk} className="rounded-md bg-muted/20 p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium capitalize">{tk}</span>
                            <label className="flex items-center gap-1 text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={c.exists}
                                onChange={(e) =>
                                  wizard.setContributionCell(p.id, tk, { exists: e.target.checked })
                                }
                              />
                              {t("exists")}
                            </label>
                          </div>
                          {c.exists && (
                            <div className="mt-2 grid grid-cols-2 gap-1">
                              <div>
                                <span className="text-muted-foreground">{t("adv")}</span>
                                <Input
                                  className="h-8"
                                  type="number"
                                  value={Math.round(c.avgDealValueSar)}
                                  onChange={(e) =>
                                    wizard.setContributionCell(p.id, tk, {
                                      avgDealValueSar: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t("cmPct")}</span>
                                <Input
                                  className="h-8"
                                  type="number"
                                  value={Math.round(c.contributionMarginPct * 1000) / 10}
                                  onChange={(e) =>
                                    wizard.setContributionCell(p.id, tk, {
                                      contributionMarginPct:
                                        Math.min(99.9, Math.max(0, Number(e.target.value) || 0)) / 100,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("stepTitles.s6")}
              <InsightBulb label={t("insight.shareTitle")} description={t("insight.shareBody")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wizard.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("needProducts")}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={Math.abs(shareSum - 1) < 0.02 ? "success" : "warning"}>
                    {t("shareSum")}: {formatPct(shareSum)}
                  </Badge>
                  <Button type="button" size="sm" variant="outline" onClick={() => wizard.normalizeServiceShares()}>
                    {t("normalizeShares")}
                  </Button>
                </div>
                {wizard.products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="min-w-[120px] font-medium">{p.name}</span>
                    <Input
                      className="h-9 w-28"
                      type="number"
                      value={Math.round((wizard.serviceRevenueShare[p.id] ?? 0) * 1000) / 10}
                      onChange={(e) =>
                        wizard.setServiceShare(
                          p.id,
                          Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100
                        )
                      }
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s7")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wizard.products.map((p) => (
              <div key={p.id} className="space-y-2">
                <p className="text-sm font-semibold">{p.name}</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {TIER_KEYS.filter((tk) => wizard.contributionCells[`${p.id}:${tk}`]?.exists).map(
                    (tk) => (
                    <div key={tk}>
                      <Label className="text-xs capitalize text-muted-foreground">{tk}</Label>
                      <Input
                        className="h-9"
                        type="number"
                        value={Math.round((wizard.tierMixByService[p.id]?.[tk] ?? 0) * 1000) / 10}
                        onChange={(e) =>
                          wizard.setTierMix(
                            p.id,
                            tk,
                            Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100
                          )
                        }
                      />
                    </div>
                  )
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 8 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("stepTitles.s8")}
              <InsightBulb label={t("insight.cmTitle")} description={t("insight.cmBody")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <Label className="text-xs">{t("blendedCmModel")}</Label>
                <p className="text-lg font-semibold tabular-nums">{formatPct(blended)}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  wizard.setBlendedCmOverride(
                    wizard.blendedCmOverride == null ? blended : null
                  )
                }
              >
                {wizard.blendedCmOverride == null ? t("lockOverride") : t("clearOverride")}
              </Button>
              {wizard.blendedCmOverride != null && (
                <Input
                  className="h-9 w-28"
                  type="number"
                  value={Math.round(wizard.blendedCmOverride * 1000) / 10}
                  onChange={(e) =>
                    wizard.setBlendedCmOverride(
                      Math.min(99.9, Math.max(0, Number(e.target.value) || 0)) / 100
                    )
                  }
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("cmCascadeNote")}</p>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 9 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s9")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("npTargetPct")}</Label>
              <Input
                className="mt-1 h-9"
                type="number"
                value={Math.round(wizard.npTargetPct * 1000) / 10}
                onChange={(e) =>
                  wizard.setNpTargetPct(Math.min(50, Math.max(0, Number(e.target.value) || 0)) / 100)
                }
              />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-sm sm:col-span-2">
              <p>
                {t("salesTarget")}:{" "}
                <strong className="tabular-nums">{fmt(model.targets.salesTarget, wizard.meta.currency)}</strong> /{" "}
                {t("month")}
              </p>
              <p>
                {t("npAtTarget")}:{" "}
                <strong className="tabular-nums">{fmt(model.targets.netProfitAtTarget, wizard.meta.currency)}</strong>
              </p>
              <p>
                ROI: <strong className="tabular-nums">{formatPct(model.targets.roi)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 10 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s10")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">{t("operational.weightedAdv")}</p>
                <p className="text-lg font-semibold tabular-nums">{fmt(model.portfolioAdv, wizard.meta.currency)}</p>
              </div>
              <div className="rounded-lg border bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">{t("operational.weightedCm")}</p>
                <p className="text-lg font-semibold">{formatPct(blended)}</p>
              </div>
              <div className="rounded-lg border bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">{t("megaShareLabel")}</p>
                <p className="text-lg font-semibold">{formatPct(model.megaPortfolioShare)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("operational.note")}</p>
            {model.tierRollups.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="app-data-table min-w-[900px] text-xs">
                  <thead>
                    <tr>
                      <th>{t("colService")}</th>
                      <th>{t("colTier")}</th>
                      <th className="text-end tabular-nums">{t("colRevenue")}</th>
                      <th className="text-end tabular-nums">{t("colContribution")}</th>
                      <th className="text-end tabular-nums">{t("colVarCost")}</th>
                      <th className="text-end tabular-nums">{t("colAwards")}</th>
                      <th className="text-end tabular-nums">{t("colProfitAlloc")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.tierRollups.map((r: TierRollupRow) => (
                      <tr key={`${r.serviceId}-${r.tierKey}`}>
                        <td className="font-medium">{r.serviceName}</td>
                        <td className="capitalize text-muted-foreground">{r.tierKey}</td>
                        <td className="text-end tabular-nums">{fmt(r.revenueSar, wizard.meta.currency)}</td>
                        <td className="text-end tabular-nums text-emerald-600 dark:text-emerald-400">
                          {fmt(r.contributionSar, wizard.meta.currency)}
                        </td>
                        <td className="text-end tabular-nums">{fmt(r.variableCostSar, wizard.meta.currency)}</td>
                        <td className="text-end tabular-nums">
                          {r.awardsRequired}
                          {r.flooredToMinDeal && (
                            <span className="ms-1 text-amber-600" title={t("awardFloorTitle")}>
                              *
                            </span>
                          )}
                        </td>
                        <td className="text-end tabular-nums font-medium">{fmt(r.profitAfterAllocatedFixedSar, wizard.meta.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border/60 bg-muted/25 font-semibold">
                      <td colSpan={2}>{t("portfolioTotals")}</td>
                      <td className="text-end tabular-nums">
                        {fmt(
                          model.tierRollups.reduce((a: number, r: TierRollupRow) => a + r.revenueSar, 0),
                          wizard.meta.currency
                        )}
                      </td>
                      <td className="text-end tabular-nums">
                        {fmt(model.tierRollups.reduce((a: number, r: TierRollupRow) => a + r.contributionSar, 0), wizard.meta.currency)}
                      </td>
                      <td className="text-end tabular-nums">
                        {fmt(model.tierRollups.reduce((a: number, r: TierRollupRow) => a + r.variableCostSar, 0), wizard.meta.currency)}
                      </td>
                      <td className="text-end tabular-nums">
                        {model.tierRollups.reduce((a: number, r: TierRollupRow) => a + r.awardsRequired, 0)}
                      </td>
                      <td className="text-end tabular-nums">
                        {fmt(
                          model.tierRollups.reduce((a: number, r: TierRollupRow) => a + r.profitAfterAllocatedFixedSar, 0),
                          wizard.meta.currency
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 11 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t("stepTitles.s11")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={Math.abs(segmentSum - 1) < 0.02 ? "success" : "warning"}>
                {t("segmentSum")}: {formatPct(segmentSum)}
              </Badge>
              <Badge variant="outline">{t("q4LoadLabel")}: {formatPct(model.q4Weight)}</Badge>
              <Button type="button" size="sm" variant="outline" onClick={() => wizard.normalizeMarketSegments()}>
                {t("normalizeSegments")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {wizard.marketSegments.map((s) => (
              <div key={s.segment}>
                <Label className="text-xs">{t(`segments.${s.segment}`)}</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  value={Math.round(s.targetPct * 1000) / 10}
                  onChange={(e) =>
                    wizard.setMarketSegment(
                      s.segment,
                      Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100
                    )
                  }
                />
              </div>
            ))}
            <div className="sm:col-span-2 space-y-2 rounded-lg border bg-muted/15 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("segmentRevenueAlloc")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {model.segmentRevenue.map((sr: SegmentRevenueRow) => (
                  <div key={sr.segment} className="flex justify-between gap-2 border-b border-border/30 py-1">
                    <span>{t(`segments.${sr.segment}`)}</span>
                    <span className="tabular-nums font-medium">{fmt(sr.revenueSar, wizard.meta.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 12 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s12")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["contactToLead", t("conv.contactToLead")],
                ["leadToQualifiedOpp", t("conv.leadToQualified")],
                ["qualifiedOppToBidding", t("conv.oppToBid")],
                ["biddingToAward", t("conv.bidToAward")],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  value={Math.round(wizard.conversionRates[key] * 1000) / 10}
                  onChange={(e) =>
                    wizard.setConversionRates({
                      [key]: Math.min(100, Math.max(0.1, Number(e.target.value) || 0)) / 100,
                    })
                  }
                />
              </div>
            ))}
            <div className="sm:col-span-2 rounded-lg border bg-muted/20 p-3 text-xs">
              <p className="font-semibold">{t("funnelBacksolve")}</p>
              <p className="mt-1 tabular-nums">
                {t("contacts")}: {model.funnelGlobal.contacts} · {t("leads")}: {model.funnelGlobal.leads} · {t("opps")}:{" "}
                {model.funnelGlobal.qualifiedOpps} · {t("biddings")}: {model.funnelGlobal.biddings}
              </p>
            </div>
            <div className="sm:col-span-2 overflow-x-auto rounded-lg border border-border/50">
              <p className="border-b bg-muted/30 p-2 text-xs font-semibold">{t("perServiceFunnel")}</p>
              <table className="app-data-table min-w-[640px] text-xs">
                <thead>
                  <tr>
                    <th>{t("colService")}</th>
                    <th className="text-end tabular-nums">{t("rev")}</th>
                    <th className="text-end tabular-nums">{t("awards")}</th>
                    <th className="text-end tabular-nums">{t("contacts")}</th>
                    <th className="text-end tabular-nums">{t("leads")}</th>
                    <th className="text-end tabular-nums">{t("opps")}</th>
                    <th className="text-end tabular-nums">{t("biddings")}</th>
                  </tr>
                </thead>
                <tbody>
                  {model.serviceRollups.map((sr: ServiceRollup) => (
                    <tr key={sr.serviceId}>
                      <td className="font-medium">{sr.serviceName}</td>
                      <td className="text-end tabular-nums">{fmt(sr.revenueSar, wizard.meta.currency)}</td>
                      <td className="text-end tabular-nums">{sr.awardsRequired}</td>
                      <td className="text-end tabular-nums">{sr.funnel.contacts}</td>
                      <td className="text-end tabular-nums">{sr.funnel.leads}</td>
                      <td className="text-end tabular-nums">{sr.funnel.qualifiedOpps}</td>
                      <td className="text-end tabular-nums">{sr.funnel.biddings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 13 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s13")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {t("annualRevenueTarget")}:{" "}
              <strong>{fmt(model.annualRevenueSar, wizard.meta.currency)}</strong>
            </p>
            <p>
              {t("portfolioAdv")}: <strong>{fmt(model.portfolioAdv, wizard.meta.currency)}</strong>
            </p>
            <p>
              {t("requiredAwardsAnnual")}: <strong>{model.awardAnnual.requiredCount}</strong>
            </p>
            {model.awardAnnual.flooredToMinDeal && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs">
                {t("awardMismatch")}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 14 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s14")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="app-data-table min-w-[720px] text-xs">
              <thead>
                <tr>
                  <th>{t("quarter")}</th>
                  <th className="text-end">{t("weightPct")}</th>
                  <th className="text-end tabular-nums">{t("rev")}</th>
                  <th className="text-end tabular-nums">{t("awards")}</th>
                  <th className="text-end tabular-nums">{t("biddings")}</th>
                  <th className="text-end tabular-nums">{t("opps")}</th>
                  <th className="text-end tabular-nums">{t("leads")}</th>
                  <th className="text-end tabular-nums">{t("contacts")}</th>
                </tr>
              </thead>
              <tbody>
                {(["q1", "q2", "q3", "q4"] as const).map((qk) => {
                  const row = model.quarterlyOps[qk];
                  const w = wizard.quarterlyWeights[qk];
                  const awardsQ = requiredAwardsFromRevenue(
                    row.revenueSar,
                    model.portfolioAdv || 1
                  ).requiredCount;
                  return (
                    <tr key={qk}>
                      <td className="font-medium uppercase">{qk}</td>
                      <td className="text-end">
                        <Input
                          className="ms-auto h-8 w-16"
                          type="number"
                          value={Math.round(w * 100)}
                          onChange={(e) =>
                            wizard.setQuarterlyWeights({
                              [qk]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100,
                            })
                          }
                        />
                      </td>
                      <td className="text-end tabular-nums">{fmt(row.revenueSar, wizard.meta.currency)}</td>
                      <td className="text-end tabular-nums">{awardsQ}</td>
                      <td className="text-end tabular-nums">{row.biddings}</td>
                      <td className="text-end tabular-nums">{row.qualifiedOpps}</td>
                      <td className="text-end tabular-nums">{row.leads}</td>
                      <td className="text-end tabular-nums">{row.contacts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">{t("quarterlyNote")}</p>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 15 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s15")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("dashboardPreviewIntro")}</p>
            <SalesPlanCharts charts={model.charts} currency={wizard.meta.currency} />
            <p className="text-xs text-muted-foreground">{t("dashboardLinkHint")}</p>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 16 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s16")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {model.insights.length === 0 ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("insightsAllClear")}</p>
            ) : (
              <ul className="space-y-2">
                {model.insights.map((ins: PlanningInsight) => (
                  <li
                    key={ins.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-sm",
                      ins.severity === "critical" && "border-rose-500/40 bg-rose-500/10",
                      ins.severity === "warning" && "border-amber-500/40 bg-amber-500/10",
                      ins.severity === "info" && "border-border/60 bg-muted/20"
                    )}
                  >
                    <Badge
                      variant={
                        ins.severity === "critical"
                          ? "destructive"
                          : ins.severity === "warning"
                            ? "warning"
                            : "secondary"
                      }
                      className="shrink-0 capitalize"
                    >
                      {ins.severity}
                    </Badge>
                    <span>{t(`insights.${ins.id}` as InsightTranslationKey)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">{t("roadmapInsight")}</p>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 17 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s17")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("capacityExplain")}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">{t("capacityUtil")}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {Math.round(model.capacity.utilizationPct)}%
                </p>
              </div>
              <div className="rounded-lg border bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">{t("capacityLoad")}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {model.capacity.loadIndex.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">{t("capacityBaseline")}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {model.capacity.baselineCapacity.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">{t("capacityBand")}</p>
                <p className="text-2xl font-semibold capitalize">{model.capacity.pressure}</p>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  model.capacity.utilizationPct >= 88
                    ? "bg-rose-500"
                    : model.capacity.utilizationPct >= 65
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(100, model.capacity.utilizationPct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {wizard.currentStep === 18 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepTitles.s18")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{t("checklistTitle")}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {t("checkRtl")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {t("checkCairo")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {t("checkCmdk")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {t("checkDark")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {t("checkPersist")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {t("checkCharts")}
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md pointer-events-auto">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <span>
            <span className="text-muted-foreground">{t("kpiStrip.revenueTarget")}</span>{" "}
            <strong className="tabular-nums">{fmt(model.targets.salesTarget, wizard.meta.currency)}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">{t("kpiStrip.breakEven")}</span>{" "}
            <strong className="tabular-nums">{fmt(breakEvenMonthly, wizard.meta.currency)}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">{t("kpiStrip.blendedCm")}</span>{" "}
            <strong>{formatPct(blended)}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">{t("kpiStrip.awards")}</span>{" "}
            <strong>{model.awardAnnual.requiredCount}</strong>
            {model.awardAnnual.flooredToMinDeal && (
              <span className="ms-1 text-amber-600">({t("kpiStrip.floor")})</span>
            )}
          </span>
          <span>
            <span className="text-muted-foreground">{t("kpiStrip.contacts")}</span>{" "}
            <strong>{model.funnelGlobal.contacts}</strong>
          </span>
        </div>
      </div>
    </div>
    </OperationalWorkspaceGate>
  );
}
