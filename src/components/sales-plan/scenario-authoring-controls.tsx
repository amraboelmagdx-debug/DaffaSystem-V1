"use client";



import { useState } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { useWorkspaceStore } from "@/stores/use-workspace-store";

import type { DemoScenario } from "@/types/domain";

import type { ScenarioType } from "@/types/scenario-governance";



const CREATE_TYPES: ScenarioType[] = [

  "custom",

  "aggressive",

  "conservative",

  "break_even",

  "stress_case",

  "hiring_freeze",

  "expansion",

  "strategic_push",

];



type Props = {

  companyId: string;

  scenarios: DemoScenario[];

  activeScenarioId: string;

  compact?: boolean;

};



export function ScenarioAuthoringControls({

  companyId,

  scenarios,

  activeScenarioId,

  compact = false,

}: Props) {

  const t = useTranslations("planning.scenarios");

  const tg = useTranslations("planning.governance");

  const createScenario = useWorkspaceStore((s) => s.createScenario);

  const [newName, setNewName] = useState("");

  const [newType, setNewType] = useState<ScenarioType>("custom");

  const [cloneSourceId, setCloneSourceId] = useState(activeScenarioId);

  const [cloneName, setCloneName] = useState("");



  const onCreateBlank = () => {

    const name = newName.trim() || t("defaultBlankName");

    createScenario({ companyId, name, scenarioType: newType });

    setNewName("");

  };



  const onDuplicate = () => {

    const sourceName = scenarios.find((s) => s.id === cloneSourceId)?.name ?? "";

    const name = cloneName.trim() || t("defaultCloneName", { source: sourceName });

    if (!cloneSourceId) return;

    createScenario({ companyId, name, cloneFromId: cloneSourceId });

    setCloneName("");

  };



  if (compact) {

    return (

      <div className="flex flex-wrap items-end gap-2">

        <Input

          value={newName}

          onChange={(e) => setNewName(e.target.value)}

          placeholder={t("namePlaceholder")}

          className="h-9 w-[140px]"

        />

        <Select value={newType} onValueChange={(v) => setNewType(v as ScenarioType)}>

          <SelectTrigger className="h-9 w-[130px]">

            <SelectValue />

          </SelectTrigger>

          <SelectContent>

            {CREATE_TYPES.map((type) => (

              <SelectItem key={type} value={type}>

                {tg(`type.${type}`)}

              </SelectItem>

            ))}

          </SelectContent>

        </Select>

        <Button type="button" size="sm" variant="outline" onClick={onCreateBlank}>

          {t("create")}

        </Button>

        <Select value={cloneSourceId} onValueChange={setCloneSourceId}>

          <SelectTrigger className="h-9 w-[160px]">

            <SelectValue placeholder={t("duplicate")} />

          </SelectTrigger>

          <SelectContent>

            {scenarios.map((s) => (

              <SelectItem key={s.id} value={s.id}>

                {s.name}

              </SelectItem>

            ))}

          </SelectContent>

        </Select>

        <Button type="button" size="sm" variant="secondary" onClick={onDuplicate}>

          {t("duplicateAction")}

        </Button>

      </div>

    );

  }



  return (

    <div className="grid gap-3 sm:grid-cols-2">

      <div className="space-y-2">

        <Label className="text-xs">{t("createBlank")}</Label>

        <Select value={newType} onValueChange={(v) => setNewType(v as ScenarioType)}>

          <SelectTrigger className="h-9">

            <SelectValue />

          </SelectTrigger>

          <SelectContent>

            {CREATE_TYPES.map((type) => (

              <SelectItem key={type} value={type}>

                {tg(`type.${type}`)}

              </SelectItem>

            ))}

          </SelectContent>

        </Select>

        <div className="flex gap-2">

          <Input

            value={newName}

            onChange={(e) => setNewName(e.target.value)}

            placeholder={t("namePlaceholder")}

            className="h-9"

          />

          <Button type="button" size="sm" variant="outline" onClick={onCreateBlank}>

            {t("create")}

          </Button>

        </div>

      </div>

      <div className="space-y-2">

        <Label className="text-xs">{t("duplicate")}</Label>

        <Select value={cloneSourceId} onValueChange={setCloneSourceId}>

          <SelectTrigger className="h-9">

            <SelectValue />

          </SelectTrigger>

          <SelectContent>

            {scenarios.map((s) => (

              <SelectItem key={s.id} value={s.id}>

                {s.name}

                {s.baseline ? ` (${t("baseline")})` : ""}

              </SelectItem>

            ))}

          </SelectContent>

        </Select>

        <div className="flex gap-2">

          <Input

            value={cloneName}

            onChange={(e) => setCloneName(e.target.value)}

            placeholder={t("cloneNamePlaceholder")}

            className="h-9"

          />

          <Button type="button" size="sm" onClick={onDuplicate}>

            {t("duplicateAction")}

          </Button>

        </div>

      </div>

    </div>

  );

}

