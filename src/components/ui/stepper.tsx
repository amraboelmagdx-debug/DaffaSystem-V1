"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperStatus = "pending" | "current" | "complete" | "error";

export interface StepperItem {
  id: string;
  label: string;
  description?: string;
  status?: StepperStatus;
}

interface StepperProps {
  items: StepperItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function Stepper({ items, activeId, onSelect, className }: StepperProps) {
  return (
    <ol className={cn("flex flex-wrap items-stretch gap-2", className)}>
      {items.map((item, index) => {
        const status: StepperStatus =
          item.status ?? (item.id === activeId ? "current" : "pending");
        const interactive = Boolean(onSelect);
        return (
          <li key={item.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              disabled={!interactive}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                status === "current" &&
                  "border-primary bg-primary/10 text-foreground",
                status === "complete" &&
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                status === "error" &&
                  "border-destructive/60 bg-destructive/10 text-destructive",
                status === "pending" &&
                  "border-border bg-muted/30 text-muted-foreground",
                interactive ? "cursor-pointer hover:border-primary/50" : "cursor-default"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  status === "complete"
                    ? "bg-emerald-500 text-white"
                    : status === "current"
                      ? "bg-primary text-primary-foreground"
                      : status === "error"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground"
                )}
              >
                {status === "complete" ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span>{item.label}</span>
            </button>
            {index < items.length - 1 ? (
              <span className="hidden text-muted-foreground sm:inline">›</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
