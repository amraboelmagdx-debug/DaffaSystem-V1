"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { Badge } from "@/components/ui/badge";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useServiceCostSimulationPrefsStore } from "@/stores/use-service-cost-simulation-prefs-store";
import { useCommercialPricingPrefsStore } from "@/stores/use-commercial-pricing-prefs-store";
import { deriveWorkspaceProjection } from "@/lib/hr-workforce/workspace-projection";
import { getTemplateLinkedTiers } from "@/lib/service-architecture/selectors";
import {
  evaluateServiceEconomics,
  buildServiceEconomicsEvaluateInput,
} from "@/lib/service-economics";
import { useServiceCostCatalogSlice } from "@/hooks/use-service-cost-catalog-slice";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { getScenarioPresetById } from "@/lib/service-cost-simulation/scenarios";
import { operationalPricingBasisFromSimulation } from "@/lib/commercial-pricing-intelligence/operational-basis";
import { runCommercialPricingIntelligence } from "@/lib/commercial-pricing-intelligence/engine";
import { COMMERCIAL_RISK_PRESETS } from "@/lib/commercial-pricing-intelligence/commercial-risk";
import {
  COMMERCIAL_PRICING_SCENARIO_PRESETS,
  getCommercialPricingScenarioById,
} from "@/lib/commercial-pricing-intelligence/commercial-pricing-scenarios";
import { MODEL_COMPARISON_DEFAULTS } from "@/lib/commercial-pricing-intelligence/model-comparison-defaults";
import { toCommercialPricingSnapshot } from "@/lib/commercial-pricing-intelligence/sales-calculator-adapter";
import type { PricingModelId } from "@/lib/commercial-pricing-intelligence/types";
import { cn } from "@/lib/utils";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";

export function CommercialPricingIntelligenceView() {
  const t = useTranslations("serviceArchitecture");
  const locale = useLocale();

  const serviceFamilies = useServiceArchitectureStore((s) => s.serviceFamilies);
  const templates = useServiceArchitectureStore((s) => s.serviceTemplates);
  const tiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const templateTiers = useServiceArchitectureStore((s) => s.serviceTemplateTiers);
  const catalog = useServiceCostCatalogSlice();
  const companies = useWorkspaceStore((s) => s.companies);

  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const departments = useHrWorkforceStore((s) => s.departments);
  const teams = useHrWorkforceStore((s) => s.teams);
  const roles = useHrWorkforceStore((s) => s.roles);
  const hrGlobalSettings = useHrWorkforceStore((s) => s.hrGlobalSettings);
  const ohManualByBusinessUnitId = useHrWorkforceStore((s) => s.ohManualByBusinessUnitId);

  const costAssumptions = useServiceCostSimulationPrefsStore((s) => s.assumptions);
  const costScenarioId = useServiceCostSimulationPrefsStore((s) => s.scenarioId);

  const commercialModel = useCommercialPricingPrefsStore((s) => s.model);
  const setCommercialModel = useCommercialPricingPrefsStore((s) => s.setModel);
  const activeRiskIds = useCommercialPricingPrefsStore((s) => s.activeRiskIds);
  const setActiveRiskIds = useCommercialPricingPrefsStore((s) => s.setActiveRiskIds);
  const commercialScenarioId = useCommercialPricingPrefsStore((s) => s.commercialScenarioId);
  const setCommercialScenarioId = useCommercialPricingPrefsStore((s) => s.setCommercialScenarioId);
  const thresholds = useCommercialPricingPrefsStore((s) => s.thresholds);
  const setThresholds = useCommercialPricingPrefsStore((s) => s.setThresholds);

  const [templateId, setTemplateId] = useState("");
  const [tierId, setTierId] = useState("");

  const workforce = useMemo(
    () =>
      deriveWorkspaceProjection({
        roles,
        businessUnits,
        departments,
        teams,
        hrGlobalSettings,
        ohManualByBusinessUnitId,
      }),
    [roles, businessUnits, departments, teams, hrGlobalSettings, ohManualByBusinessUnitId]
  );

  const costScenario = useMemo(() => getScenarioPresetById(costScenarioId), [costScenarioId]);
  const commercialScenario = useMemo(
    () => getCommercialPricingScenarioById(commercialScenarioId),
    [commercialScenarioId]
  );

  const commercialPrefs = useMemo(
    () => ({
      model: commercialModel,
      activeRiskIds,
      scenario: commercialScenario,
      thresholds,
    }),
    [commercialModel, activeRiskIds, commercialScenario, thresholds]
  );

  const economicsBase = useMemo(
    () => ({
      catalog,
      workforce,
      roles,
      businessUnitIds: businessUnits.map((b) => b.id),
      companies,
      currency: hrGlobalSettings.defaultCurrency,
      assumptions: costAssumptions,
      scenario: costScenario,
    }),
    [
      catalog,
      workforce,
      roles,
      businessUnits,
      companies,
      hrGlobalSettings.defaultCurrency,
      costAssumptions,
      costScenario,
    ]
  );

  const economics = useMemo(() => {
    if (!templateId || !tierId) return null;
    return evaluateServiceEconomics(
      buildServiceEconomicsEvaluateInput(economicsBase, templateId, tierId, commercialPrefs)
    );
  }, [economicsBase, templateId, tierId, commercialPrefs]);

  const costSim = economics?.ok ? economics.cost : economics && !economics.ok ? { ok: false as const, errors: economics.errors } : null;

  const basis = useMemo(() => {
    if (!economics?.ok) return null;
    return operationalPricingBasisFromSimulation(economics.cost, hrGlobalSettings.defaultCurrency);
  }, [economics, hrGlobalSettings.defaultCurrency]);

  const commercial = economics?.ok ? economics.commercial ?? null : null;

  const linkedTiers = useMemo(() => {
    if (!templateId) return [];
    return getTemplateLinkedTiers({ serviceTemplateId: templateId, templateTiers, tiers });
  }, [templateId, templateTiers, tiers]);

  const tierCommercialCompare = useMemo(() => {
    if (!templateId || !economics?.ok) return [];
    return linkedTiers.map((tier) => {
      const r = evaluateServiceEconomics(
        buildServiceEconomicsEvaluateInput(economicsBase, templateId, tier.id, commercialPrefs)
      );
      if (!r.ok || !r.commercial?.ok) return { tier, price: 0, contrib: 0 };
      return {
        tier,
        price: r.commercial.suggestedCommercialPrice,
        contrib: r.commercial.margins.contributionMarginPct,
      };
    });
  }, [templateId, linkedTiers, economicsBase, commercialPrefs, economics?.ok]);

  const modelStrategyCompare = useMemo(() => {
    if (!basis) return [];
    return (Object.keys(MODEL_COMPARISON_DEFAULTS) as PricingModelId[]).map((id) => {
      const spec = MODEL_COMPARISON_DEFAULTS[id];
      const r = runCommercialPricingIntelligence({
        basis,
        model: spec,
        activeRiskIds,
        scenario: commercialScenario,
        thresholds,
      });
      if (!r.ok) return { id, price: 0, gross: 0, contrib: 0 };
      return {
        id,
        price: r.suggestedCommercialPrice,
        gross: r.margins.grossMarginPct,
        contrib: r.margins.contributionMarginPct,
      };
    });
  }, [basis, activeRiskIds, commercialScenario, thresholds]);

  const familyEconomics = useMemo(() => {
    const famById = new Map(serviceFamilies.map((f) => [f.id, f.name]));
    const byFam = new Map<string, { name: string; margins: number[] }>();
    for (const tpl of templates) {
      const tt = templateTiers.find((x) => x.serviceTemplateId === tpl.id);
      if (!tt) continue;
      const r = evaluateServiceEconomics(
        buildServiceEconomicsEvaluateInput(economicsBase, tpl.id, tt.serviceTierId, {
          model: { modelId: "cost_plus", markupPct: 32 },
          activeRiskIds: [],
          scenario: getCommercialPricingScenarioById("neutral"),
          thresholds,
        })
      );
      if (!r.ok || !r.commercial?.ok) continue;
      const p = r.commercial;
      const fname = famById.get(tpl.serviceFamilyId) ?? tpl.serviceFamilyId;
      const cur = byFam.get(tpl.serviceFamilyId) ?? { name: fname, margins: [] };
      cur.margins.push(p.margins.contributionMarginPct);
      byFam.set(tpl.serviceFamilyId, cur);
    }
    return [...byFam.entries()].map(([fid, v]) => ({
      familyId: fid,
      familyName: v.name,
      avgContribution:
        v.margins.reduce((s, x) => s + x, 0) / Math.max(1, v.margins.length),
      samples: v.margins.length,
    }));
  }, [templates, templateTiers, economicsBase, thresholds, serviceFamilies]);

  const sensitivitySpread = useMemo(() => {
    if (!commercial?.ok) return 0;
    const rows = commercial.sensitivity.map((r) => r.contributionMarginPct);
    return Math.max(...rows) - Math.min(...rows);
  }, [commercial]);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: hrGlobalSettings.defaultCurrency?.length === 3 ? hrGlobalSettings.defaultCurrency : "SAR",
      maximumFractionDigits: 0,
    }).format(n);

  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  const toggleRisk = (id: string) => {
    setActiveRiskIds(
      activeRiskIds.includes(id) ? activeRiskIds.filter((x) => x !== id) : [...activeRiskIds, id]
    );
  };

  const updateModelField = (key: string, value: number) => {
    const m = commercialModel;
    switch (m.modelId) {
      case "cost_plus":
        setCommercialModel({ ...m, markupPct: value });
        break;
      case "value_based":
        setCommercialModel({ ...m, valueMultiplier: value });
        break;
      case "retainer_oriented":
        setCommercialModel({ ...m, coverageBufferPct: value });
        break;
      case "strategic_account":
        if (key === "relationshipDiscountPct") setCommercialModel({ ...m, relationshipDiscountPct: value });
        else setCommercialModel({ ...m, baseMarkupPct: value });
        break;
      case "market_penetration":
      case "premium_positioning":
        setCommercialModel({ ...m, loadedToPriceMultiplier: value });
        break;
      default:
        break;
    }
  };

  const calculatorJson = useMemo(() => {
    if (!commercial?.ok || !economics?.ok) return "";
    return JSON.stringify(
      toCommercialPricingSnapshot(
        { serviceTemplateId: commercial.basis.serviceTemplateId, tierId: commercial.basis.serviceTierId },
        commercial
      ),
      null,
      2
    );
  }, [commercial, economics]);

  return (
    <div className="space-y-6">
      <SampleDataPanel moduleId="commercial-pricing-prefs" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("commercialPricingTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("commercialPricingSubtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <InsightBulb label={t("commercialNotQuotationTitle")} description={t("commercialNotQuotationBody")} wide />
        <InsightBulb label={t("commercialSeparationTitle")} description={t("commercialSeparationBody")} wide />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("commercialScopeTitle")}</CardTitle>
          <CardDescription>{t("commercialScopeHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("selectTemplate")}</Label>
            <Select
              value={templateId}
              onValueChange={(v) => {
                setTemplateId(v);
                setTierId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectTemplate")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("selectTier")}</Label>
            <Select value={tierId} onValueChange={setTierId} disabled={!templateId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectTier")} />
              </SelectTrigger>
              <SelectContent>
                {linkedTiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name} ({tier.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!costSim && <p className="text-sm text-muted-foreground">{t("commercialPickScope")}</p>}
      {costSim && !costSim.ok && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">{t("costIntelErrorTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{costSim.errors.join(" · ")}</CardContent>
        </Card>
      )}

      {costSim?.ok && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("costIntelTotalLoaded")}</CardDescription>
              <CardTitle className="text-lg">{fmtMoney(costSim.totals.totalLoadedCost)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("commercialSuggestedPrice")}</CardDescription>
              <CardTitle className="text-lg">
                {commercial?.ok ? fmtMoney(commercial.suggestedCommercialPrice) : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("commercialContributionMargin")}</CardDescription>
              <CardTitle className="text-lg">
                {commercial?.ok ? fmtPct(commercial.margins.contributionMarginPct) : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {basis && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("commercialModelTitle")}</CardTitle>
              <CardDescription>{t("commercialModelHint")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("commercialModelSelect")}</Label>
                <Select
                  value={commercialModel.modelId}
                  onValueChange={(id) => {
                    const d = MODEL_COMPARISON_DEFAULTS[id as PricingModelId];
                    setCommercialModel(d);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODEL_COMPARISON_DEFAULTS) as PricingModelId[]).map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                {commercialModel.modelId === "cost_plus" && (
                  <Param label="markup %" value={commercialModel.markupPct} onChange={(n) => updateModelField("markupPct", n)} />
                )}
                {commercialModel.modelId === "value_based" && (
                  <Param label="value multiplier" value={commercialModel.valueMultiplier} onChange={(n) => updateModelField("valueMultiplier", n)} />
                )}
                {commercialModel.modelId === "retainer_oriented" && (
                  <Param
                    label="coverage buffer %"
                    value={commercialModel.coverageBufferPct}
                    onChange={(n) => updateModelField("coverageBufferPct", n)}
                  />
                )}
                {commercialModel.modelId === "strategic_account" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Param
                      label="base markup %"
                      value={commercialModel.baseMarkupPct}
                      onChange={(n) => updateModelField("baseMarkupPct", n)}
                    />
                    <Param
                      label="relationship discount %"
                      value={commercialModel.relationshipDiscountPct}
                      onChange={(n) => updateModelField("relationshipDiscountPct", n)}
                    />
                  </div>
                )}
                {(commercialModel.modelId === "market_penetration" ||
                  commercialModel.modelId === "premium_positioning") && (
                  <Param
                    label="loaded→price multiplier"
                    value={commercialModel.loadedToPriceMultiplier}
                    onChange={(n) => updateModelField("loadedToPriceMultiplier", n)}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("commercialRisksTitle")}</CardTitle>
              <CardDescription>{t("commercialRisksHint")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {COMMERCIAL_RISK_PRESETS.map((r) => (
                <Button
                  key={r.id}
                  type="button"
                  size="sm"
                  variant={activeRiskIds.includes(r.id) ? "default" : "outline"}
                  className={cn("text-xs", activeRiskIds.includes(r.id) && "shadow-sm")}
                  onClick={() => toggleRisk(r.id)}
                >
                  {r.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("commercialScenarioTitle")}</CardTitle>
              <CardDescription>{t("commercialScenarioHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={commercialScenarioId} onValueChange={setCommercialScenarioId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMERCIAL_PRICING_SCENARIO_PRESETS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{commercialScenario.competitivenessNote}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("commercialThresholdsTitle")}</CardTitle>
              <CardDescription>{t("commercialThresholdsHint")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <ThresholdField
                label="min gross %"
                value={thresholds.minGrossMarginPct}
                onChange={(n) => setThresholds({ minGrossMarginPct: n })}
              />
              <ThresholdField
                label="min contribution %"
                value={thresholds.minContributionMarginPct}
                onChange={(n) => setThresholds({ minContributionMarginPct: n })}
              />
              <ThresholdField
                label="safety contribution %"
                value={thresholds.pricingSafetyContributionMarginPct}
                onChange={(n) => setThresholds({ pricingSafetyContributionMarginPct: n })}
              />
            </CardContent>
          </Card>

          {commercial?.ok && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialWaterfallTitle")}</CardTitle>
                  <CardDescription>{t("commercialWaterfallHint")}</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {commercial.modelBreakdown.map((row) => (
                        <tr key={row.key} className="border-b border-border/60">
                          <td className="py-2 pe-2">{row.label}</td>
                          <td className="py-2 text-end">{fmtMoney(row.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-b border-border/60">
                        <td className="py-2 pe-2">{t("commercialRowRiskStack")}</td>
                        <td className="py-2 text-end">×{commercial.riskStackMultiplier.toFixed(4)}</td>
                      </tr>
                      <tr className="border-b border-border/60">
                        <td className="py-2 pe-2">{t("commercialRowScenario")}</td>
                        <td className="py-2 text-end">×{commercial.scenario.priceMultiplier.toFixed(4)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pe-2 font-medium">{t("commercialRowSuggested")}</td>
                        <td className="py-2 text-end font-medium">{fmtMoney(commercial.suggestedCommercialPrice)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialMarginAnalyticsTitle")}</CardTitle>
                  <CardDescription>{t("commercialMarginAnalyticsHint")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label={t("commercialGrossMargin")} value={fmtPct(commercial.margins.grossMarginPct)} />
                  <Metric label={t("commercialContributionMargin")} value={fmtPct(commercial.margins.contributionMarginPct)} />
                  <Metric label={t("commercialOhShare")} value={fmtPct(commercial.margins.ohShareOfPricePct)} />
                  <Metric label={t("commercialDirectShare")} value={fmtPct(commercial.margins.directCostShareOfPricePct)} />
                </CardContent>
              </Card>

              {commercial.marginWarnings.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="text-sm">{t("commercialMarginWarningsTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-muted-foreground">
                    {commercial.marginWarnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialSensitivityTitle")}</CardTitle>
                  <CardDescription>
                    {t("commercialSensitivityHint", { spread: sensitivitySpread.toFixed(1) })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pe-2">{t("commercialSensitivityColSweep")}</th>
                        <th className="py-2 pe-2">{t("commercialSensitivityColPrice")}</th>
                        <th className="py-2 pe-2">{t("commercialGrossMargin")}</th>
                        <th className="py-2">{t("commercialContributionMargin")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commercial.sensitivity.map((row) => (
                        <tr key={row.label} className="border-b border-border/60">
                          <td className="py-2 pe-2">{row.label}</td>
                          <td className="py-2 pe-2">{fmtMoney(row.suggestedPrice)}</td>
                          <td className="py-2 pe-2">{fmtPct(row.grossMarginPct)}</td>
                          <td className="py-2">{fmtPct(row.contributionMarginPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialExplainTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  {commercial.explanation.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialStrategyCompareTitle")}</CardTitle>
                  <CardDescription>{t("commercialStrategyCompareHint")}</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pe-2">{t("commercialModelSelect")}</th>
                        <th className="py-2 pe-2">{t("commercialSensitivityColPrice")}</th>
                        <th className="py-2 pe-2">{t("commercialGrossMargin")}</th>
                        <th className="py-2">{t("commercialContributionMargin")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelStrategyCompare.map((row) => (
                        <tr key={row.id} className="border-b border-border/60">
                          <td className="py-2 pe-2 font-mono text-xs">{row.id}</td>
                          <td className="py-2 pe-2">{fmtMoney(row.price)}</td>
                          <td className="py-2 pe-2">{fmtPct(row.gross)}</td>
                          <td className="py-2">{fmtPct(row.contrib)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialTierPriceCompareTitle")}</CardTitle>
                  <CardDescription>{t("commercialTierPriceCompareHint")}</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pe-2">{t("colTier")}</th>
                        <th className="py-2 pe-2">{t("commercialSensitivityColPrice")}</th>
                        <th className="py-2">{t("commercialContributionMargin")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierCommercialCompare.map((row) => (
                        <tr key={row.tier.id} className="border-b border-border/60">
                          <td className="py-2 pe-2">
                            {row.tier.name}{" "}
                            <span className="text-muted-foreground">({row.tier.code})</span>
                          </td>
                          <td className="py-2 pe-2">{fmtMoney(row.price)}</td>
                          <td className="py-2">{fmtPct(row.contrib)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialFamilyEconomicsTitle")}</CardTitle>
                  <CardDescription>{t("commercialFamilyEconomicsHint")}</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {familyEconomics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("commercialFamilyEconomicsEmpty")}</p>
                  ) : (
                    <table className="w-full min-w-[400px] text-left text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-2 pe-2">{t("colFamily")}</th>
                          <th className="py-2 pe-2">{t("commercialFamilyAvgContrib")}</th>
                          <th className="py-2">{t("commercialFamilySamples")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {familyEconomics.map((row) => (
                          <tr key={row.familyId} className="border-b border-border/60">
                            <td className="py-2 pe-2">{row.familyName}</td>
                            <td className="py-2 pe-2">{fmtPct(row.avgContribution)}</td>
                            <td className="py-2">{row.samples}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialSensitiveTitle")}</CardTitle>
                  <CardDescription>{t("commercialSensitiveHint", { spread: sensitivitySpread.toFixed(1) })}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="font-normal">
                    {t("commercialSensitiveBadge", { spread: sensitivitySpread.toFixed(1) })}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("commercialCalculatorAdapterTitle")}</CardTitle>
                  <CardDescription>{t("commercialCalculatorAdapterHint")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{calculatorJson}</pre>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Param({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step="0.01"
        value={String(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </div>
  );
}

function ThresholdField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={String(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
