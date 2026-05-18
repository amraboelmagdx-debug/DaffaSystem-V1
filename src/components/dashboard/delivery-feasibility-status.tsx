"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type {
  OperationalFeasibilityResult,
  OperationalFeasibilityStatus,
} from "@/types/operational-feasibility";

type Props = {
  result: OperationalFeasibilityResult;
  compareStatus?: OperationalFeasibilityStatus;
};

function statusVariant(status: OperationalFeasibilityStatus) {
  switch (status) {
    case "feasible":
      return "secondary" as const;
    case "constrained":
      return "outline" as const;
    case "infeasible":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function DeliveryFeasibilityStatus({ result, compareStatus }: Props) {
  const t = useTranslations("planning.feasibility");

  if (result.status === "unavailable") {
    return (
      <p className="text-sm text-muted-foreground">{t("unavailableHint")}</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={statusVariant(result.status)}>{t(`status.${result.status}`)}</Badge>
      {compareStatus && compareStatus !== result.status ? (
        <span className="text-xs text-muted-foreground">
          vs {t(`status.${compareStatus}`)}
        </span>
      ) : null}
    </div>
  );
}
