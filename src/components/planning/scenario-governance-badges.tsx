"use client";

import { Lock, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ScenarioGovernance } from "@/types/scenario-governance";

type Props = {
  governance: ScenarioGovernance;
  baseline?: boolean;
  compact?: boolean;
};

export function ScenarioGovernanceBadges({ governance, baseline, compact }: Props) {
  const tg = useTranslations("planning.governance");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={compact ? "text-[10px]" : "text-xs"}>
        {tg(`type.${governance.scenarioType}`)}
      </Badge>
      <Badge
        variant={
          governance.status === "approved"
            ? "default"
            : governance.status === "draft"
              ? "secondary"
              : "outline"
        }
        className={compact ? "text-[10px]" : "text-xs"}
      >
        {tg(`status.${governance.status}`)}
      </Badge>
      {(governance.isReference || baseline) && (
        <Badge variant="secondary" className={compact ? "text-[10px]" : "text-xs"}>
          <Star className="me-1 size-3" aria-hidden />
          {tg("reference")}
        </Badge>
      )}
      {governance.status === "locked" && (
        <Badge variant="destructive" className={compact ? "text-[10px]" : "text-xs"}>
          <Lock className="me-1 size-3" aria-hidden />
          {tg("locked")}
        </Badge>
      )}
    </div>
  );
}

