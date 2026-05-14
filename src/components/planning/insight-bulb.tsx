"use client";

import { Lightbulb } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InsightBulbProps {
  label: string;
  description: string;
  className?: string;
  /** Use a wider tooltip (e.g. dense forms with longer help). */
  wide?: boolean;
}

/** Short executive-style explainer next to dense planning concepts. */
export function InsightBulb({ label, description, className, wide }: InsightBulbProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400",
              className
            )}
            aria-label={label}
          >
            <Lightbulb className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className={cn(
            "border-amber-500/20 bg-card text-xs leading-relaxed shadow-lg",
            wide ? "max-w-md sm:max-w-lg" : "max-w-xs"
          )}
        >
          <p className="font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
