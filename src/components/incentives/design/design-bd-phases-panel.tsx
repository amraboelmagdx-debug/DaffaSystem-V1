"use client";

import { useTranslations } from "next-intl";
import type { BdPhasePolicy, IncentivePlan, SalesPhaseWeights } from "@/types/incentives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const PHASE_KEYS: (keyof SalesPhaseWeights)[] = [
  "lead_gen",
  "technical",
  "financial",
  "closing",
];

export function DesignBdPhasesPanel({
  plan,
  onChange,
}: {
  plan: IncentivePlan;
  onChange: (patch: Partial<IncentivePlan>) => void;
}) {
  const t = useTranslations("incentives");
  const policy: BdPhasePolicy = plan.bdPhasePolicy ?? {
    defaultPhaseWeights: {
      lead_gen: 0.15,
      technical: 0.25,
      financial: 0.25,
      closing: 0.35,
    },
    leadTypeMultipliers: { normal: 1, known_budget: 1.1 },
    proposalTypeMultipliers: { internal_team: 1, internal_plus_vendors: 1.08 },
  };

  const setPhase = (key: keyof SalesPhaseWeights, value: number) => {
    onChange({
      bdPhasePolicy: {
        ...policy,
        defaultPhaseWeights: {
          ...policy.defaultPhaseWeights,
          [key]: value / 100,
        },
      },
    });
  };

  const setLeadMult = (known_budget: number) => {
    onChange({
      bdPhasePolicy: {
        ...policy,
        leadTypeMultipliers: { normal: 1, known_budget: known_budget / 100 + 1 },
      },
    });
  };

  const setProposalMult = (vendors: number) => {
    onChange({
      bdPhasePolicy: {
        ...policy,
        proposalTypeMultipliers: {
          internal_team: 1,
          internal_plus_vendors: vendors / 100 + 1,
        },
      },
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{t("designBdPhases")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          {PHASE_KEYS.map((k) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{t(`phase.${k}`)}</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((policy.defaultPhaseWeights[k] ?? 0) * 100)}
                onChange={(e) => setPhase(k, Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">
                {((policy.defaultPhaseWeights[k] ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("knownBudgetBonus")}</Label>
            <input
              type="range"
              min={0}
              max={30}
              value={Math.round(
                ((policy.leadTypeMultipliers?.known_budget ?? 1) - 1) * 100
              )}
              onChange={(e) => setLeadMult(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("vendorsBonus")}</Label>
            <input
              type="range"
              min={0}
              max={30}
              value={Math.round(
                ((policy.proposalTypeMultipliers?.internal_plus_vendors ?? 1) - 1) *
                  100
              )}
              onChange={(e) => setProposalMult(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
