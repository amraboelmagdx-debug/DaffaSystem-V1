"use client";

import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MEASURE_CATALOG } from "@/lib/planning/measures/measure-catalog";
import type { MeasureId } from "@/lib/planning/measures/measure-ids";

function measureMessageKey(relativeKey: string): string {
  return relativeKey.startsWith("measures.") ? relativeKey.slice("measures.".length) : relativeKey;
}

export function OxExplainMetric({ measureId }: { measureId: MeasureId }) {
  const tMeasures = useTranslations("measures");
  const tOx = useTranslations("ox");
  const meta = MEASURE_CATALOG.find((m) => m.id === measureId);
  if (!meta) return null;

  let label = meta.label;
  let description = "";
  try {
    label = tMeasures(measureMessageKey(meta.labelKey) as never);
    description = tMeasures(measureMessageKey(meta.descriptionKey) as never);
  } catch {
    /* use fallbacks */
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground hover:text-foreground"
            aria-label={tOx("explain.open")}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-xs leading-relaxed">
          <p className="font-medium">{label}</p>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
