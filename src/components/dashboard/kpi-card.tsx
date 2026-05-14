"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  delta?: string;
  positive?: boolean;
  explanation: string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  delta,
  positive,
  explanation,
  className,
}: KpiCardProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur",
          className
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`About ${title}`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
              {explanation}
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
        {delta && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              positive === false
                ? "text-rose-500"
                : positive === true
                  ? "text-emerald-500"
                  : "text-muted-foreground"
            )}
          >
            {delta}
          </p>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
