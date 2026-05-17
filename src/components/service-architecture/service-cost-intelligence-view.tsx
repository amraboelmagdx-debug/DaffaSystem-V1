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
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useServiceCostSimulationPrefsStore } from "@/stores/use-service-cost-simulation-prefs-store";
import { deriveWorkspaceProjection } from "@/lib/hr-workforce/workspace-projection";
import { getTemplateLinkedTiers } from "@/lib/service-architecture/selectors";
import { evaluateServiceEconomics, buildServiceEconomicsEvaluateInput } from "@/lib/service-economics";
import { useServiceCostCatalogSlice } from "@/hooks/use-service-cost-catalog-slice";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { getScenarioPresetById, SERVICE_COST_SCENARIO_PRESETS } from "@/lib/service-cost-simulation/scenarios";
import { toServiceCostBaselineSnapshot } from "@/lib/service-cost-simulation/sales-plan-cost-adapter";
import { exportAssumptionsToImportRows, buildServiceCostAssumptionImportPreview } from "@/lib/service-cost-simulation/cost-assumption-import";
import { DEFAULT_SERVICE_COST_ASSUMPTIONS } from "@/lib/service-cost-simulation/defaults";
import { Badge } from "@/components/ui/badge";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";

export function ServiceCostIntelligenceView() {
  const t = useTranslations("serviceArchitecture");
  const locale = useLocale();

  const templates = useServiceArchitectureStore((s) => s.serviceTemplates);
  const tiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const templateTiers = useServiceArchitectureStore((s) => s.serviceTemplateTiers);

  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const departments = useHrWorkforceStore((s) => s.departments);
  const teams = useHrWorkforceStore((s) => s.teams);
  const roles = useHrWorkforceStore((s) => s.roles);
  const hrGlobalSettings = useHrWorkforceStore((s) => s.hrGlobalSettings);
  const ohManualByBusinessUnitId = useHrWorkforceStore((s) => s.ohManualByBusinessUnitId);

  const assumptions = useServiceCostSimulationPrefsStore((s) => s.assumptions);
  const scenarioId = useServiceCostSimulationPrefsStore((s) => s.scenarioId);
  const setAssumptions = useServiceCostSimulationPrefsStore((s) => s.setAssumptions);
  const setScenarioId = useServiceCostSimulationPrefsStore((s) => s.setScenarioId);
  const resetAssumptions = useServiceCostSimulationPrefsStore((s) => s.resetAssumptions);

  const catalog = useServiceCostCatalogSlice();
  const companies = useWorkspaceStore((s) => s.companies);

  const [templateId, setTemplateId] = useState("");
  const [tierId, setTierId] = useState("");
  const [importPreview, setImportPreview] = useState("");

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

  const scenario = useMemo(() => getScenarioPresetById(scenarioId), [scenarioId]);

  const economicsBase = useMemo(
    () => ({
      catalog,
      workforce,
      roles,
      businessUnitIds: businessUnits.map((b) => b.id),
      companies,
      currency: hrGlobalSettings.defaultCurrency,
      assumptions,
      scenario,
    }),
    [catalog, workforce, roles, businessUnits, companies, hrGlobalSettings.defaultCurrency, assumptions, scenario]
  );

  const simulation = useMemo(() => {
    if (!templateId || !tierId) return null;
    const result = evaluateServiceEconomics(
      buildServiceEconomicsEvaluateInput(economicsBase, templateId, tierId)
    );
    if (result.ok) return result.cost;
    return { ok: false as const, errors: result.errors };
  }, [economicsBase, templateId, tierId]);

  const baselineJson = useMemo(() => {
    if (!simulation?.ok) return "";
    return JSON.stringify(
      toServiceCostBaselineSnapshot(
        { serviceTemplateId: simulation.templateId, tierId: simulation.tierId },
        simulation
      ),
      null,
      2
    );
  }, [simulation]);

  const linkedTiers = useMemo(() => {
    if (!templateId) return [];
    return getTemplateLinkedTiers({ serviceTemplateId: templateId, templateTiers, tiers });
  }, [templateId, templateTiers, tiers]);

  const tierCompare = useMemo(() => {
    if (!templateId || linkedTiers.length === 0) return [];
    return linkedTiers
      .map((tier) => {
        const r = evaluateServiceEconomics(
          buildServiceEconomicsEvaluateInput(economicsBase, templateId, tier.id)
        );
        if (!r.ok) return { tier, loaded: 0, hours: 0, direct: 0, oh: 0 };
        return {
          tier,
          loaded: r.cost.totals.totalLoadedCost,
          hours: r.cost.totals.totalEffectiveHours,
          direct: r.cost.totals.totalDirectCost,
          oh: r.cost.totals.totalOhContribution,
        };
      })
      .sort((a, b) => a.tier.name.localeCompare(b.tier.name));
  }, [templateId, linkedTiers, economicsBase]);

  const topPhases = useMemo(() => {
    if (!simulation?.ok) return [];
    return [...simulation.phases].sort((a, b) => b.phaseLoadedTotal - a.phaseLoadedTotal).slice(0, 5);
  }, [simulation]);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: hrGlobalSettings.defaultCurrency?.length === 3 ? hrGlobalSettings.defaultCurrency : "SAR",
      maximumFractionDigits: 0,
    }).format(n);

  const fmtNum = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);

  return (
    <div className="space-y-6">
      <SampleDataPanel moduleId="service-cost-simulation-prefs" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("costIntelTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("costIntelSubtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <InsightBulb label={t("costIntelNotPriceTitle")} description={t("costIntelNotPriceBody")} wide />
        <InsightBulb label={t("costIntelOhTitle")} description={t("costIntelOhBody")} wide />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("costIntelFiltersTitle")}</CardTitle>
          <CardDescription>{t("costIntelFiltersHint")}</CardDescription>
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
          <div className="space-y-2 md:col-span-2">
            <Label>{t("costIntelScenarioLabel")}</Label>
            <Select value={scenarioId} onValueChange={setScenarioId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_COST_SCENARIO_PRESETS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {SERVICE_COST_SCENARIO_PRESETS.find((s) => s.id === scenarioId)?.description ?? ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t("costIntelAssumptionsTitle")}</CardTitle>
            <CardDescription>{t("costIntelAssumptionsHint")}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => resetAssumptions()}>
            {t("costIntelResetAssumptions")}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(DEFAULT_SERVICE_COST_ASSUMPTIONS) as Array<keyof typeof DEFAULT_SERVICE_COST_ASSUMPTIONS>).map(
            (key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground">{key}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={String(assumptions[key])}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setAssumptions({ [key]: n } as Partial<typeof assumptions>);
                  }}
                />
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("costIntelImportExportTitle")}</CardTitle>
          <CardDescription>{t("costIntelImportExportHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const rows = exportAssumptionsToImportRows(assumptions);
              setImportPreview(JSON.stringify(rows, null, 2));
            }}
          >
            {t("costIntelExportAssumptions")}
          </Button>
          <div className="space-y-1">
            <Label className="text-xs">{t("costIntelImportPreviewLabel")}</Label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={importPreview}
              onChange={(e) => setImportPreview(e.target.value)}
              placeholder='[{"assumptionKey":"qaSensitivityFactor","numericValue":"1.2"}]'
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                const parsed = JSON.parse(importPreview || "[]") as { assumptionKey: string; numericValue: string }[];
                const r = buildServiceCostAssumptionImportPreview(parsed);
                if (r.valid) {
                  setAssumptions(r.mergedAssumptions);
                } else {
                  alert(r.issues.map((i) => `Row ${i.rowIndex}: ${i.message}`).join("\n"));
                }
              } catch {
                alert("Invalid JSON");
              }
            }}
          >
            {t("costIntelApplyImportPreview")}
          </Button>
        </CardContent>
      </Card>

      {!simulation && (
        <p className="text-sm text-muted-foreground">{t("costIntelPickTemplateTier")}</p>
      )}
      {simulation && !simulation.ok && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">{t("costIntelErrorTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm">
              {simulation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {simulation?.ok && (
        <>
          {simulation.warnings.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-sm">{t("costIntelWarningsTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                {simulation.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("costIntelTotalLoaded")}</CardDescription>
                <CardTitle className="text-lg">{fmtMoney(simulation.totals.totalLoadedCost)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("costIntelTotalDirect")}</CardDescription>
                <CardTitle className="text-lg">{fmtMoney(simulation.totals.totalDirectCost)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("costIntelOhContribution")}</CardDescription>
                <CardTitle className="text-lg">{fmtMoney(simulation.totals.totalOhContribution)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("costIntelEffectiveHours")}</CardDescription>
                <CardTitle className="text-lg">{fmtNum(simulation.totals.totalEffectiveHours)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("costIntelPhaseCostTitle")}</CardTitle>
              <CardDescription>{t("costIntelPhaseCostHint")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pe-2">{t("colPhase")}</th>
                    <th className="py-2 pe-2">{t("costIntelColDirect")}</th>
                    <th className="py-2 pe-2">{t("costIntelColLoaded")}</th>
                    <th className="py-2 pe-2">{t("costIntelColOh")}</th>
                    <th className="py-2">{t("costIntelColHours")}</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.phases.map((p) => (
                    <tr key={p.serviceTemplateTierPhaseId} className="border-b border-border/60">
                      <td className="py-2 pe-2">
                        <div className="font-medium">{p.phaseName}</div>
                        <div className="text-xs text-muted-foreground">{p.phaseCode}</div>
                      </td>
                      <td className="py-2 pe-2">{fmtMoney(p.phaseDirectTotal)}</td>
                      <td className="py-2 pe-2">{fmtMoney(p.phaseLoadedTotal)}</td>
                      <td className="py-2 pe-2">{fmtMoney(p.phaseOhContribution)}</td>
                      <td className="py-2">{fmtNum(p.phaseEffectiveHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("costIntelRoleRollupTitle")}</CardTitle>
              <CardDescription>{t("costIntelRoleRollupHint")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pe-2">{t("colRole")}</th>
                    <th className="py-2 pe-2">{t("costIntelColLoaded")}</th>
                    <th className="py-2">{t("costIntelColHours")}</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.roles.map((r) => (
                    <tr key={r.jobRoleId} className="border-b border-border/60">
                      <td className="py-2 pe-2">{r.roleName}</td>
                      <td className="py-2 pe-2">{fmtMoney(r.loadedCost)}</td>
                      <td className="py-2">{fmtNum(r.effectiveHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("costIntelDeliverableTitle")}</CardTitle>
              <CardDescription>{t("costIntelDeliverableHint")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {simulation.deliverables.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("costIntelNoDeliverables")}</p>
              ) : (
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pe-2">{t("colDeliverable")}</th>
                      <th className="py-2 pe-2">{t("colPhase")}</th>
                      <th className="py-2 pe-2">{t("costIntelColShare")}</th>
                      <th className="py-2 pe-2">{t("costIntelColLoaded")}</th>
                      <th className="py-2">{t("costIntelColHours")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.deliverables.map((d) => (
                      <tr key={d.deliverableId} className="border-b border-border/60">
                        <td className="py-2 pe-2">{d.name}</td>
                        <td className="py-2 pe-2 text-muted-foreground">{d.contributingPhaseName}</td>
                        <td className="py-2 pe-2">{fmtNum(d.shareOfPhase)}</td>
                        <td className="py-2 pe-2">{fmtMoney(d.loadedCost)}</td>
                        <td className="py-2">{fmtNum(d.effectiveHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{t("costIntelTopPhasesTitle")}</CardTitle>
                <CardDescription>{t("costIntelTopPhasesHint")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {topPhases.map((p, i) => (
                <Badge key={p.serviceTemplateTierPhaseId} variant="secondary" className="text-xs font-normal">
                  #{i + 1} {p.phaseName}: {fmtMoney(p.phaseLoadedTotal)}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("costIntelTierCompareTitle")}</CardTitle>
              <CardDescription>{t("costIntelTierCompareHint")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pe-2">{t("colTier")}</th>
                    <th className="py-2 pe-2">{t("costIntelColLoaded")}</th>
                    <th className="py-2 pe-2">{t("costIntelColDirect")}</th>
                    <th className="py-2 pe-2">{t("costIntelOhContribution")}</th>
                    <th className="py-2">{t("costIntelColHours")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tierCompare.map((row) => (
                    <tr key={row.tier.id} className="border-b border-border/60">
                      <td className="py-2 pe-2">
                        {row.tier.name}{" "}
                        <span className="text-muted-foreground">({row.tier.code})</span>
                      </td>
                      <td className="py-2 pe-2">{fmtMoney(row.loaded)}</td>
                      <td className="py-2 pe-2">{fmtMoney(row.direct)}</td>
                      <td className="py-2 pe-2">{fmtMoney(row.oh)}</td>
                      <td className="py-2">{fmtNum(row.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("costIntelSalesPlanAdapterTitle")}</CardTitle>
              <CardDescription>{t("costIntelSalesPlanAdapterHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{baselineJson}</pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
