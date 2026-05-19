"use client";

import { useTranslations } from "next-intl";
import { ScenarioMetadataPanel } from "@/components/planning/scenario-metadata-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

type Props = {
  activeScenarioId: string;
};

export function SalesPlanContextPanel({ activeScenarioId }: Props) {
  const t = useTranslations("salesPlan.contextPanel");
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const activeBundle = activeScenarioId ? scenarioBundles[activeScenarioId] : null;

  if (!activeBundle) {
    return (
      <Card className="border-border/60 bg-card/50">
        <CardContent className="pt-6 text-sm text-muted-foreground">{t("noScenario")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 lg:sticky lg:top-36">
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("metadataTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScenarioMetadataPanel bundle={activeBundle} />
        </CardContent>
      </Card>
    </div>
  );
}
