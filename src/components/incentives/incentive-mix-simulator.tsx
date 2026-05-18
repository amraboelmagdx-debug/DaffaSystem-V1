"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { IncentivePlan } from "@/types/incentives";
import type { DemoCompany } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { generateSyntheticDeals } from "@/lib/incentives/generate-synthetic-deals";
import { evaluateIncentiveRun } from "@/lib/incentives/evaluate-incentive-run";
import { participantsFromHrRoles } from "@/lib/incentives/opportunity-bridge";
import type { JobRole } from "@/types/hr-workforce";

export function IncentiveMixSimulator({
  plan,
  company,
  hrBuId,
  roles,
  scorecardMultiplier,
  onApplyMix,
}: {
  plan: IncentivePlan;
  company: DemoCompany;
  hrBuId: string;
  roles: JobRole[];
  scorecardMultiplier: number;
  onApplyMix: (deals: ReturnType<typeof generateSyntheticDeals>) => void;
}) {
  const t = useTranslations("incentives");
  const [count, setCount] = useState(5);
  const [referralPct, setReferralPct] = useState(0.2);
  const [newClientPct, setNewClientPct] = useState(0.3);
  const [tinyPct, setTinyPct] = useState(10);
  const [standardPct, setStandardPct] = useState(50);
  const [bigPct, setBigPct] = useState(30);
  const [megaPct, setMegaPct] = useState(10);

  const preview = useMemo(() => {
    const deals = generateSyntheticDeals({
      count,
      tierMix: {
        tiny: tinyPct,
        standard: standardPct,
        big: bigPct,
        mega: megaPct,
      },
      referralPct,
      newClientPct,
      avgDealValueSar: 1_200_000,
      company,
      profiles: plan.tierProfiles,
    });
    const result = evaluateIncentiveRun({
      plan,
      deals,
      participants: participantsFromHrRoles(roles, hrBuId),
      periodYear: new Date().getFullYear(),
      mode: "simulation",
      scorecardMultiplier,
    });
    return { deals, result };
  }, [
    plan,
    company,
    roles,
    hrBuId,
    count,
    referralPct,
    newClientPct,
    tinyPct,
    standardPct,
    bigPct,
    megaPct,
    scorecardMultiplier,
  ]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{t("mixSimulator")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <label className="block space-y-1">
          <Label className="text-xs">{t("mixCount")}</Label>
          <input
            type="range"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-muted-foreground">{count} deals</span>
        </label>
        <label className="block space-y-1">
          <Label className="text-xs">{t("mixReferral")}</Label>
          <input
            type="range"
            min={0}
            max={100}
            value={referralPct * 100}
            onChange={(e) => setReferralPct(Number(e.target.value) / 100)}
            className="w-full"
          />
        </label>
        <label className="block space-y-1">
          <Label className="text-xs">{t("mixNewClient")}</Label>
          <input
            type="range"
            min={0}
            max={100}
            value={newClientPct * 100}
            onChange={(e) => setNewClientPct(Number(e.target.value) / 100)}
            className="w-full"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["tiny", tinyPct, setTinyPct],
              ["standard", standardPct, setStandardPct],
              ["big", bigPct, setBigPct],
              ["mega", megaPct, setMegaPct],
            ] as const
          ).map(([key, val, set]) => (
            <label key={key} className="space-y-1">
              <span className="text-xs capitalize">{key}</span>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full rounded border border-input px-2 py-1"
                value={val}
                onChange={(e) => set(Number(e.target.value) || 0)}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
          onClick={() => onApplyMix(preview.deals)}
        >
          {t("applyMixToRun")}
        </button>
        {preview.result.ok ? (
          <p className="text-xs text-muted-foreground">
            {t("mixPreviewTotal", {
              total: Math.round(preview.result.snapshot.companyTotalSar).toLocaleString(),
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
