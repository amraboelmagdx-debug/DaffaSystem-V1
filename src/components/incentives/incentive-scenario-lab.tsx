"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { IncentiveDealInput, IncentivePlan } from "@/types/incentives";
import type { DemoCompany } from "@/types/domain";
import type { JobRole } from "@/types/hr-workforce";
import type { OpportunityTierKey } from "@/types/sales-plan";
import { evaluateIncentiveRun } from "@/lib/incentives";
import { incentiveDealFromValues } from "@/lib/incentives/opportunity-bridge";
import { participantsFromPlan } from "@/lib/incentives/participants-from-plan";
import { deriveEvaluateOptionsFromPlan } from "@/lib/incentives/plan-options";
import { evaluateOperationalWarnings } from "@/lib/incentives/operational-warnings";
import { formatCurrency } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useIncentivePlanStore } from "@/stores/use-incentive-plan-store";

const TIER_KEYS: OpportunityTierKey[] = ["tiny", "standard", "big", "mega"];

export function IncentiveScenarioLab({
  plan,
  company,
  hrBuId,
  roles,
  periodYear,
  npTargetPct,
  scorecardMultiplier,
  managerTeamAttainment,
  projectedRevenueSar,
}: {
  plan: IncentivePlan;
  company: DemoCompany;
  hrBuId: string;
  roles: JobRole[];
  periodYear: number;
  npTargetPct: number;
  scorecardMultiplier: number;
  managerTeamAttainment: number;
  projectedRevenueSar?: number;
}) {
  const t = useTranslations("incentives");
  const savePreset = useIncentivePlanStore((s) => s.savePreset);
  const presets = useIncentivePlanStore((s) => s.presets);

  const [dealCount, setDealCount] = useState(12);
  const [referralPct, setReferralPct] = useState(25);
  const [newClientPct, setNewClientPct] = useState(40);
  const [tierMix, setTierMix] = useState<Record<OpportunityTierKey, number>>({
    tiny: 20,
    standard: 40,
    big: 30,
    mega: 10,
  });
  const [avgDealByTier, setAvgDealByTier] = useState<Record<OpportunityTierKey, number>>({
    tiny: 80_000,
    standard: 1_200_000,
    big: 4_000_000,
    mega: 12_000_000,
  });
  const [attainmentSliders, setAttainmentSliders] = useState<Record<string, number>>({});

  const syntheticDeals = useMemo(() => {
    const deals: IncentiveDealInput[] = [];
    const totalMix = TIER_KEYS.reduce((s, k) => s + tierMix[k], 0) || 100;
    let idx = 0;
    const pseudoRand = (seed: number) => {
      const x = Math.sin(seed * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (const tierKey of TIER_KEYS) {
      const n = Math.round(dealCount * (tierMix[tierKey] / totalMix));
      for (let i = 0; i < n; i++) {
        idx += 1;
        const referral = pseudoRand(idx + referralPct) * 100 < referralPct;
        const newClient = pseudoRand(idx + newClientPct + 17) * 100 < newClientPct;
        const value = avgDealByTier[tierKey];
        deals.push(
          incentiveDealFromValues({
            id: `lab-${tierKey}-${idx}`,
            label: `Lab ${tierKey} #${idx}`,
            dealValueSar: value,
            marginSar: value * 0.35,
            referral,
            clientType: newClient ? "new_client" : "existing_client",
            complexity: "normal",
            accrualMonth: `${periodYear}-06`,
            company,
            profiles: plan.tierProfiles,
          })
        );
      }
    }
    return deals;
  }, [dealCount, tierMix, referralPct, newClientPct, avgDealByTier, periodYear, company, plan.tierProfiles]);

  const labMultiplier = useMemo(() => {
    let m = scorecardMultiplier;
    for (const c of plan.scorecard.components) {
      const att = (attainmentSliders[c.id] ?? 100) / 100;
      if (c.componentKey === "financial" && att > 1 && c.accelerator) {
        m *= 1 + (att - 1) * (c.accelerator.rateAbove ?? 0.1);
      }
    }
    return Math.min(m, 1.5);
  }, [scorecardMultiplier, attainmentSliders, plan.scorecard.components]);

  const result = useMemo(() => {
    const participants = participantsFromPlan(plan, roles, hrBuId);
    return evaluateIncentiveRun({
      plan,
      deals: syntheticDeals,
      participants,
      periodYear,
      mode: "simulation",
      scorecardMultiplier: labMultiplier,
      managerTeamAttainment,
      options: deriveEvaluateOptionsFromPlan(plan),
    });
  }, [
    plan,
    syntheticDeals,
    roles,
    hrBuId,
    periodYear,
    labMultiplier,
    managerTeamAttainment,
  ]);

  const warnings = useMemo(() => {
    if (!result.ok) return [];
    return evaluateOperationalWarnings(plan, result.snapshot, {
      deals: syntheticDeals,
      projectedRevenueSar,
      npTargetPct,
      teamFinancialAttainment: managerTeamAttainment,
    });
  }, [plan, result, syntheticDeals, projectedRevenueSar, npTargetPct, managerTeamAttainment]);

  const fmt = (n: number) => formatCurrency(n, "SAR");

  const saveAsPreset = () => {
    void savePreset(hrBuId, {
      name: `Lab ${new Date().toISOString().slice(0, 16)}`,
      count: dealCount,
      referralPct,
      newClientPct,
      tierMix: Object.fromEntries(
        TIER_KEYS.map((k) => [k, tierMix[k] / 100])
      ) as Partial<Record<OpportunityTierKey, number>>,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("scenarioLab")}</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={saveAsPreset}>
            {t("savePreset")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-muted-foreground">
            {t("scenarioLabHint")} · NP {npTargetPct}%
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1">
              <Label className="text-xs">{t("mixCount")}</Label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-input px-2 py-1 text-sm"
                value={dealCount}
                onChange={(e) => setDealCount(Number(e.target.value) || 1)}
              />
            </label>
            <label className="space-y-1">
              <Label className="text-xs">{t("mixReferral")}</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={referralPct}
                onChange={(e) => setReferralPct(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs">{referralPct}%</span>
            </label>
            <label className="space-y-1">
              <Label className="text-xs">{t("mixNewClient")}</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={newClientPct}
                onChange={(e) => setNewClientPct(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs">{newClientPct}%</span>
            </label>
          </div>

          <div className="space-y-3">
            <Label className="text-xs">{t("tierMixBars")}</Label>
            {TIER_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-3 text-sm">
                <span className="w-20 capitalize">{k}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tierMix[k]}
                  onChange={(e) =>
                    setTierMix((m) => ({ ...m, [k]: Number(e.target.value) }))
                  }
                  className="flex-1"
                />
                <span className="w-10 text-right text-xs">{tierMix[k]}%</span>
                <input
                  type="number"
                  className="w-28 rounded border border-input px-1 py-0.5 text-xs"
                  value={avgDealByTier[k]}
                  onChange={(e) =>
                    setAvgDealByTier((m) => ({
                      ...m,
                      [k]: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("scorecardAttainmentSliders")}</Label>
            {plan.scorecard.components.map((c) => (
              <label key={c.id} className="flex items-center gap-3 text-sm">
                <span className="w-40">{t(`score.${c.componentKey}`)}</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={attainmentSliders[c.id] ?? 100}
                  onChange={(e) =>
                    setAttainmentSliders((s) => ({
                      ...s,
                      [c.id]: Number(e.target.value),
                    }))
                  }
                  className="flex-1"
                />
                <span className="w-12 text-xs">{attainmentSliders[c.id] ?? 100}%</span>
              </label>
            ))}
          </div>

          {result.ok ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs">{t("companyTotal")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {fmt(result.snapshot.companyTotalSar)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs">{t("companyRetained")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {fmt(result.snapshot.companyRetainedSar)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs">{t("annualAccrual")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {fmt(result.snapshot.annual.accrualTotalSar)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs">{t("labMultiplier")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {labMultiplier.toFixed(2)}×
                </CardContent>
              </Card>
            </div>
          ) : null}

          {result.ok ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("byLayer")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {Object.entries(result.snapshot.byLayer).map(([id, amt]) => (
                      <div key={id} className="flex justify-between">
                        <span>{plan.layers.find((l) => l.id === id)?.label ?? id}</span>
                        <span>{fmt(amt)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("byPerson")}</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {Object.entries(result.snapshot.byParticipant).map(([id, amt]) => (
                      <div key={id} className="flex justify-between">
                        <span>{roles.find((r) => r.id === id)?.name ?? id}</span>
                        <span>{fmt(amt)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("periodRollups")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-xs">
                  {result.snapshot.quarterly.map((q) => (
                    <span key={q.periodKey} className="rounded border border-border/50 px-2 py-1">
                      {q.periodKey}: {fmt(q.accrualTotalSar)}
                    </span>
                  ))}
                  {result.snapshot.semiannual.map((h) => (
                    <span key={h.periodKey} className="rounded border border-border/50 px-2 py-1">
                      {h.periodKey}: {fmt(h.accrualTotalSar)}
                    </span>
                  ))}
                </CardContent>
              </Card>
              {warnings.length ? (
                <ul className="text-xs text-amber-600">
                  {warnings.map((w, i) => (
                    <li key={`${w.code}-${i}`}>{w.message}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : result && !result.ok ? (
            <p className="text-sm text-destructive">{result.errors.join(", ")}</p>
          ) : null}

          {presets.length ? (
            <p className="text-xs text-muted-foreground">
              {t("presetCount", { count: presets.length })}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
