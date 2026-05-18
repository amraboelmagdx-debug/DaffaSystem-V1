"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScenarioGovernanceBadges } from "@/components/planning/scenario-governance-badges";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import type {
  PostureLevel,
  ScenarioStatus,
  ScenarioType,
} from "@/types/scenario-governance";

const SCENARIO_TYPES: ScenarioType[] = [
  "baseline",
  "break_even",
  "conservative",
  "aggressive",
  "expansion",
  "stress_case",
  "recovery_plan",
  "hiring_freeze",
  "market_downturn",
  "strategic_push",
  "custom",
];

const STATUSES: ScenarioStatus[] = ["draft", "active", "approved", "locked", "archived"];

const POSTURE_LEVELS: PostureLevel[] = ["low", "neutral", "high"];

type Props = {
  bundle: ScenarioPlanningBundle;
};

export function ScenarioMetadataPanel({ bundle }: Props) {
  const tg = useTranslations("planning.governance");
  const updateScenarioGovernance = useWorkspaceStore((s) => s.updateScenarioGovernance);
  const archiveScenario = useWorkspaceStore((s) => s.archiveScenario);
  const isEditable = useWorkspaceStore((s) => s.isScenarioEditable(bundle.scenario.id));
  const g = bundle.governance;

  const [tagInput, setTagInput] = useState("");

  const patch = (p: Parameters<typeof updateScenarioGovernance>[1]) => {
    if (!isEditable && p.status !== "locked" && p.status !== "archived") return;
    updateScenarioGovernance(bundle.scenario.id, p);
  };

  const toggleLock = () => {
    updateScenarioGovernance(bundle.scenario.id, {
      status: g.status === "locked" ? "draft" : "locked",
    });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || g.tags.includes(t)) return;
    patch({ tags: [...g.tags, t] });
    setTagInput("");
  };

  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{tg("metadataTitle")}</CardTitle>
        <ScenarioGovernanceBadges governance={g} baseline={bundle.scenario.baseline} />
        {!isEditable ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">{tg("readOnlyHint")}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">{tg("fieldType")}</Label>
            <Select
              value={g.scenarioType}
              onValueChange={(v) => patch({ scenarioType: v as ScenarioType })}
              disabled={!isEditable}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIO_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {tg(`type.${t}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tg("fieldStatus")}</Label>
            <Select
              value={g.status}
              onValueChange={(v) => patch({ status: v as ScenarioStatus })}
              disabled={!isEditable && g.status !== "locked"}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tg(`status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{tg("fieldObjective")}</Label>
          <Input
            className="h-9 text-sm"
            value={g.strategicObjective}
            disabled={!isEditable}
            onChange={(e) => patch({ strategicObjective: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{tg("fieldHorizon")}</Label>
          <Input
            className="h-9 text-sm"
            value={g.planningHorizon}
            disabled={!isEditable}
            placeholder={tg("horizonPlaceholder")}
            onChange={(e) => patch({ planningHorizon: e.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(["confidenceLevel", "aggressivenessLevel", "riskLevel"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{tg(`field.${key}`)}</Label>
              <Select
                value={g[key]}
                onValueChange={(v) => patch({ [key]: v as PostureLevel })}
                disabled={!isEditable}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSTURE_LEVELS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tg(`posture.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{tg("fieldDescription")}</Label>
          <Input
            className="h-9 text-sm"
            value={g.description}
            disabled={!isEditable}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{tg("fieldNotes")}</Label>
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={g.notes}
            disabled={!isEditable}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{tg("fieldTags")}</Label>
          <div className="flex gap-2">
            <Input
              className="h-9 text-sm"
              value={tagInput}
              disabled={!isEditable}
              placeholder={tg("tagPlaceholder")}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" size="sm" variant="outline" disabled={!isEditable} onClick={addTag}>
              {tg("addTag")}
            </Button>
          </div>
          {g.tags.length > 0 ? (
            <p className="text-xs text-muted-foreground">{g.tags.join(" · ")}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleLock}
          >
            {g.status === "locked" ? tg("unlock") : tg("lock")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={g.status === "archived"}
            onClick={() => {
              const ok = archiveScenario(bundle.scenario.id);
              if (!ok) alert(tg("archiveBaselineBlocked"));
            }}
          >
            {tg("archive")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={g.status === "approved"}
            onClick={() => patch({ status: "approved" })}
          >
            {tg("markApproved")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
