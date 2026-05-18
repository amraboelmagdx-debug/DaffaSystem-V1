"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { IncentiveDealInput, IncentivePlan } from "@/types/incentives";
import type { DemoCompany } from "@/types/domain";
import type { JobRole } from "@/types/hr-workforce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IncentiveScenarioLab } from "@/components/incentives/incentive-scenario-lab";
import { IncentiveMixSimulator } from "@/components/incentives/incentive-mix-simulator";
import { IncentiveRetainedPanel } from "@/components/incentives/incentive-retained-panel";
import { incentiveDealFromValues } from "@/lib/incentives/opportunity-bridge";
import type { IncentiveSnapshot } from "@/types/incentives";

export function IncentiveSimulateWorkspace({
  plan,
  company,
  hrBuId,
  roles,
  periodYear,
  npTargetPct,
  scorecardMultiplier,
  managerTeamAttainment,
  projectedRevenueSar,
  simDeal,
  onSimDealChange,
  onApplyMix,
  snapshot,
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
  simDeal: IncentiveDealInput;
  onSimDealChange: (deal: IncentiveDealInput) => void;
  onApplyMix: (deals: IncentiveDealInput[]) => void;
  snapshot?: IncentiveSnapshot | null;
}) {
  const t = useTranslations("incentives");

  const resolvedWhatIf = useMemo(
    () =>
      incentiveDealFromValues({
        id: simDeal.id,
        label: simDeal.label,
        dealValueSar: simDeal.dealValueSar,
        marginSar: simDeal.marginSar,
        referral: simDeal.referral,
        clientType: simDeal.clientType,
        complexity: simDeal.complexity,
        accrualMonth: simDeal.accrualMonth,
        company,
        profiles: plan.tierProfiles,
        revenueStreamId: simDeal.revenueStreamId,
        tierKey: simDeal.tierKey,
      }),
    [simDeal, company, plan.tierProfiles]
  );

  return (
    <div className="space-y-6">
      <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {t("simulateOnboarding")}
      </p>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">{t("dealSimulator")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("tier")}</span>
              <Select
                value={simDeal.tierKey}
                onValueChange={(v) =>
                  onSimDealChange({
                    ...simDeal,
                    tierKey: v as IncentiveDealInput["tierKey"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["tiny", "standard", "big", "mega"] as const).map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={simDeal.referral}
                onChange={(e) =>
                  onSimDealChange({ ...simDeal, referral: e.target.checked })
                }
              />
              {t("referral")}
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">{t("dealValue")}</span>
            <input
              type="number"
              className="w-full rounded-md border border-input bg-background px-2 py-1"
              value={simDeal.dealValueSar}
              onChange={(e) =>
                onSimDealChange({
                  ...simDeal,
                  dealValueSar: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          {resolvedWhatIf.tierResolution?.summary ? (
            <p className="text-xs text-muted-foreground">
              {resolvedWhatIf.tierResolution.summary}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <IncentiveScenarioLab
        plan={plan}
        company={company}
        hrBuId={hrBuId}
        roles={roles}
        periodYear={periodYear}
        npTargetPct={npTargetPct}
        scorecardMultiplier={scorecardMultiplier}
        managerTeamAttainment={managerTeamAttainment}
        projectedRevenueSar={projectedRevenueSar}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <IncentiveMixSimulator
          plan={plan}
          company={company}
          hrBuId={hrBuId}
          roles={roles}
          scorecardMultiplier={scorecardMultiplier}
          onApplyMix={onApplyMix}
        />
        {snapshot ? (
          <IncentiveRetainedPanel snapshot={snapshot} plan={plan} />
        ) : null}
      </div>
    </div>
  );
}
