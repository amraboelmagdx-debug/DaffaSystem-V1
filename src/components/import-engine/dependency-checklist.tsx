"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { DependencyCheck } from "@/lib/import-engine/types";
import { cn } from "@/lib/utils";

interface DependencyChecklistProps {
  checks: DependencyCheck[];
}

export function DependencyChecklist({ checks }: DependencyChecklistProps) {
  if (checks.length === 0) return null;
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">Module dependencies</p>
      <ul className="space-y-2 text-sm">
        {checks.map((c) => (
          <li key={c.moduleId} className="flex items-start gap-2">
            <span className="mt-0.5">
              {c.status === "satisfied" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              ) : c.status === "partial" ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
              )}
            </span>
            <span className="flex-1">
              <span
                className={cn(
                  "font-medium",
                  c.status === "missing" && "text-destructive"
                )}
              >
                {c.label}
              </span>
              {c.detail ? (
                <span className="block text-xs text-muted-foreground">{c.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
