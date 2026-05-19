"use client";

import { useTranslations } from "next-intl";
import { buildScenarioIntentLine } from "@/lib/planning/scenario";
import { useScenarioIntentLabels } from "@/lib/planning/scenario/use-scenario-intent-labels";
import { ScenarioGovernanceBadges } from "@/components/planning/scenario-governance-badges";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import type { PostureLevel } from "@/types/scenario-governance";

type Props = {
  bundle: ScenarioPlanningBundle;
  bundlesById: Record<string, ScenarioPlanningBundle>;
  active?: boolean;
  onSelect?: () => void;
  /** Horizontal rail: narrower card without posture chips. */
  compact?: boolean;
};

function postureChip(
  label: string,
  level: PostureLevel,
  tg: ReturnType<typeof useTranslations<"planning.governance">>
) {
  if (level === "neutral") return null;
  return (
    <Badge key={label} variant="outline" className="text-[10px] font-normal">
      {label}: {tg(`posture.${level}`)}
    </Badge>
  );
}

export function ScenarioSummaryCard({
  bundle,
  bundlesById,
  active,
  onSelect,
  compact = false,
}: Props) {
  const tg = useTranslations("planning.governance");
  const intentLabels = useScenarioIntentLabels();
  const g = bundle.governance;
  const intent = buildScenarioIntentLine(bundle, bundlesById, intentLabels);
  const s = g.assumptionsSummary;

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{bundle.scenario.name}</span>
        <ScenarioGovernanceBadges
          governance={g}
          baseline={bundle.scenario.baseline}
          compact
        />
        <span className="text-[10px] text-muted-foreground">
          v{bundle.version} · {new Date(bundle.updatedAt).toLocaleDateString()}
        </span>
      </div>
      <p
        className={cn(
          "text-muted-foreground",
          compact ? "mt-1 line-clamp-1 text-[10px]" : "mt-1.5 line-clamp-2 text-xs"
        )}
      >
        {intent}
      </p>
      {!compact ? (
        <>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px] font-normal">
          {tg("assumptionNp", { pct: (s.targetNpPct * 100).toFixed(0) })}
        </Badge>
        {postureChip(tg("chipGrowth"), s.growthPosture, tg)}
        {postureChip(tg("chipPricing"), s.pricingPosture, tg)}
        {postureChip(tg("chipUtilization"), s.utilizationPosture, tg)}
        {postureChip(tg("chipHiring"), s.hiringPosture, tg)}
        {postureChip(tg("chipCost"), s.costPosture, tg)}
      </div>
      {g.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {g.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
        </>
      ) : null}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "rounded-lg border text-start transition-colors",
          compact ? "min-w-[11rem] shrink-0 p-2.5" : "w-full p-3",
          active
            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
            : "border-border/60 bg-muted/10 hover:bg-muted/20"
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        active ? "border-primary/50 bg-primary/5" : "border-border/60 bg-muted/10"
      )}
    >
      {inner}
    </div>
  );
}
