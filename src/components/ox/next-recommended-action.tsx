"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getNextRecommendedAction } from "@/lib/ox/next-recommended-action";
import { useWorkflowProgressInput } from "@/hooks/use-workflow-progress";

export function NextRecommendedAction() {
  const t = useTranslations("ox");
  const input = useWorkflowProgressInput();
  const action = getNextRecommendedAction(input);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("nextAction.label")}
          </p>
          <p className="mt-1 font-medium">{t(action.labelKey)}</p>
          <p className="text-sm text-muted-foreground">{t(action.descriptionKey)}</p>
        </div>
        <Button asChild variant={action.variant === "primary" ? "default" : "outline"}>
          <Link href={action.href} className="gap-2">
            {t(action.labelKey)}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
