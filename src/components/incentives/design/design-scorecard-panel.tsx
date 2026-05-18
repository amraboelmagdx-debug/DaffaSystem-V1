"use client";

import { useTranslations } from "next-intl";
import type {
  IncentivePlan,
  IncentiveScorecardComponent,
  ManagerTeamRule,
  ScorecardComponentKey,
} from "@/types/incentives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const COMPONENT_KEYS: ScorecardComponentKey[] = [
  "financial",
  "new_clients",
  "specific_service",
  "client_segment",
  "opportunity_type",
];

export function DesignScorecardPanel({
  plan,
  onChange,
}: {
  plan: IncentivePlan;
  onChange: (patch: Partial<IncentivePlan>) => void;
}) {
  const t = useTranslations("incentives");
  const components = plan.scorecard.components;
  const rule: ManagerTeamRule = plan.managerTeamRule ?? {
    teamAchievedMinPct: 0.8,
    teamOverPct: 1,
    managerFullMultiplier: 1,
    managerUnderTeamMultiplier: 0.85,
    managerOverTeamBonusPct: 0.1,
  };

  const updateComponent = (id: string, patch: Partial<IncentiveScorecardComponent>) => {
    onChange({
      scorecard: {
        ...plan.scorecard,
        components: components.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    });
  };

  const addComponent = () => {
    const id = `sc-${Date.now()}`;
    onChange({
      scorecard: {
        ...plan.scorecard,
        components: [
          ...components,
          {
            id,
            componentKey: "financial",
            weight: 0.1,
            targetValue: 1,
            actualSource: "manual",
            targetGrain: "quarterly",
          },
        ],
      },
    });
  };

  const removeComponent = (id: string) => {
    onChange({
      scorecard: {
        ...plan.scorecard,
        components: components.filter((c) => c.id !== id),
      },
    });
  };

  const setManagerRule = (patch: Partial<ManagerTeamRule>) => {
    onChange({ managerTeamRule: { ...rule, ...patch } });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("designScorecard")}</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addComponent}>
            {t("addScorecardComponent")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {components.map((c) => (
            <div
              key={c.id}
              className="grid gap-2 rounded-md border border-border/50 p-3 sm:grid-cols-5"
            >
              <div className="space-y-1">
                <Label className="text-xs">{t("componentType")}</Label>
                <select
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={c.componentKey}
                  onChange={(e) =>
                    updateComponent(c.id, {
                      componentKey: e.target.value as ScorecardComponentKey,
                    })
                  }
                >
                  {COMPONENT_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {t(`score.${k}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("weightPct")}</Label>
                <input
                  type="number"
                  className="h-8 w-full rounded-md border border-input px-2 text-sm"
                  value={Math.round(c.weight * 100)}
                  onChange={(e) =>
                    updateComponent(c.id, { weight: (Number(e.target.value) || 0) / 100 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("targetValue")}</Label>
                <input
                  type="number"
                  className="h-8 w-full rounded-md border border-input px-2 text-sm"
                  value={c.targetValue}
                  onChange={(e) =>
                    updateComponent(c.id, { targetValue: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("targetGrain")}</Label>
                <select
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={c.targetGrain ?? "quarterly"}
                  onChange={(e) =>
                    updateComponent(c.id, {
                      targetGrain: e.target.value as IncentiveScorecardComponent["targetGrain"],
                    })
                  }
                >
                  <option value="quarterly">{t("grainQuarterly")}</option>
                  <option value="annual">{t("grainAnnual")}</option>
                  <option value="monthly">{t("grainMonthly")}</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeComponent(c.id)}
                >
                  {t("remove")}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">{t("designManagerRule")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">{t("teamAchievedMin")}</span>
            <input
              type="number"
              step={0.05}
              className="w-full rounded-md border border-input px-2 py-1"
              value={rule.teamAchievedMinPct}
              onChange={(e) =>
                setManagerRule({ teamAchievedMinPct: Number(e.target.value) || 0.8 })
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">{t("managerUnderMult")}</span>
            <input
              type="number"
              step={0.05}
              className="w-full rounded-md border border-input px-2 py-1"
              value={rule.managerUnderTeamMultiplier}
              onChange={(e) =>
                setManagerRule({
                  managerUnderTeamMultiplier: Number(e.target.value) || 0.85,
                })
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">{t("managerOverBonus")}</span>
            <input
              type="number"
              step={0.05}
              className="w-full rounded-md border border-input px-2 py-1"
              value={rule.managerOverTeamBonusPct}
              onChange={(e) =>
                setManagerRule({
                  managerOverTeamBonusPct: Number(e.target.value) || 0.1,
                })
              }
            />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
