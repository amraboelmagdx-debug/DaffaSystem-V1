"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OperatorMode } from "@/lib/ox/operator-mode";
import { OPERATOR_MODE_LABEL_KEYS } from "@/lib/ox/operator-mode";

const modeStyles: Record<OperatorMode, string> = {
  monitor: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  author: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  simulate: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  govern: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  diagnose: "border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-300",
};

export function OperatorModeBadge({
  mode,
  className,
}: {
  mode: OperatorMode;
  className?: string;
}) {
  const t = useTranslations("ox");
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", modeStyles[mode], className)}
    >
      {t(OPERATOR_MODE_LABEL_KEYS[mode])}
    </Badge>
  );
}
