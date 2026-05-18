"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { DemoScenario } from "@/types/domain";

type Props = {
  compareMode: boolean;
  onCompareModeChange: (on: boolean) => void;
  baseScenarioId: string;
  compareScenarioId: string;
  onBaseChange: (id: string) => void;
  onCompareChange: (id: string) => void;
  scenarios: DemoScenario[];
};

export function ScenarioComparisonToolbar({
  compareMode,
  onCompareModeChange,
  baseScenarioId,
  compareScenarioId,
  onBaseChange,
  onCompareChange,
  scenarios,
}: Props) {
  const t = useTranslations("planning.comparison");

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t("toolbarTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("toolbarHint")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={compareMode ? "default" : "outline"}
          onClick={() => onCompareModeChange(!compareMode)}
        >
          {compareMode ? t("exitCompare") : t("enterCompare")}
        </Button>
      </div>

      {compareMode ? (
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs">{t("baseScenario")}</Label>
            <Select value={baseScenarioId} onValueChange={onBaseChange}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("compareScenario")}</Label>
            <Select value={compareScenarioId} onValueChange={onCompareChange}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
