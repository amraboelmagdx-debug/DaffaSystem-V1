"use client";

import { useTranslations } from "next-intl";
import type { ScenarioIntentLabels } from "./scenario-governance";
import type { PostureLevel, ScenarioStatus, ScenarioType } from "@/types/scenario-governance";

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

const SCENARIO_STATUSES: ScenarioStatus[] = [
  "draft",
  "active",
  "archived",
  "locked",
  "approved",
];

const POSTURE_LEVELS: PostureLevel[] = ["low", "neutral", "high"];

export function useScenarioIntentLabels(): ScenarioIntentLabels {
  const tg = useTranslations("planning.governance");

  const type = {} as Record<ScenarioType, string>;
  for (const k of SCENARIO_TYPES) {
    type[k] = tg(`type.${k}`);
  }

  const status = {} as Record<ScenarioStatus, string>;
  for (const k of SCENARIO_STATUSES) {
    status[k] = tg(`status.${k}`);
  }

  const posture = {} as Record<PostureLevel, string>;
  for (const k of POSTURE_LEVELS) {
    posture[k] = tg(`posture.${k}`);
  }

  return {
    type,
    status,
    posture,
    clonedFrom: (name) => tg("intent.clonedFrom", { name }),
    reference: tg("intent.reference"),
    targetingNp: (pct) => tg("intent.targetingNp", { pct }),
    viaPostures: (parts) => tg("intent.viaPostures", { parts }),
    customObjective: (text) => text,
  };
}
