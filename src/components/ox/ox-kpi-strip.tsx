"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type KpiItem = {
  id: string;
  label: string;
  value: ReactNode;
  hint?: string;
  emphasize?: boolean;
};

export function OxKpiStrip({
  items,
  maxPrimary = 6,
  className,
}: {
  items: KpiItem[];
  maxPrimary?: number;
  className?: string;
}) {
  const primary = items.slice(0, maxPrimary);
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        className
      )}
    >
      {primary.map((kpi) => (
        <div
          key={kpi.id}
          className={cn(
            "rounded-xl border bg-card/60 p-4 shadow-sm backdrop-blur-sm",
            kpi.emphasize ? "border-primary/30 ring-1 ring-primary/10" : "border-border/60"
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {kpi.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{kpi.value}</p>
          {kpi.hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
