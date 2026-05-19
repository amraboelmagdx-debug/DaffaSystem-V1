"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type {
  ImportChangeSummaryRow,
  ImportIssue,
} from "@/lib/import-engine/types";
import { cn } from "@/lib/utils";

interface ValidationSummaryProps {
  issues: ImportIssue[];
  changeSummary: ImportChangeSummaryRow[];
}

export function ValidationSummary({ issues, changeSummary }: ValidationSummaryProps) {
  const counts = {
    error: issues.filter((i) => i.level === "error").length,
    warning: issues.filter((i) => i.level === "warning").length,
    info: issues.filter((i) => i.level === "info").length,
  };
  const totals = changeSummary.reduce(
    (acc, r) => {
      acc.inserts += r.inserts;
      acc.updates += r.updates;
      return acc;
    },
    { inserts: 0, updates: 0 }
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Validation</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <Pill
            tone="error"
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            label="Errors"
            value={counts.error}
          />
          <Pill
            tone="warning"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Warnings"
            value={counts.warning}
          />
          <Pill
            tone="info"
            icon={<Info className="h-3.5 w-3.5" />}
            label="Info"
            value={counts.info}
          />
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Change preview</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <Pill
            tone="success"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Inserts"
            value={totals.inserts}
          />
          <Pill
            tone="info"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Updates"
            value={totals.updates}
          />
        </div>
        {changeSummary.length ? (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {changeSummary.map((row) => (
              <li key={row.entity} className="flex items-center justify-between">
                <span>{row.entity}</span>
                <span className="tabular-nums">
                  +{row.inserts} / ~{row.updates}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function Pill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "error" | "warning" | "info" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-between gap-1.5 rounded-md border px-2 py-1.5",
        tone === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "warning" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "info" && "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        tone === "success" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      )}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        <span className="font-medium">{label}</span>
      </span>
      <span className="tabular-nums font-semibold">{value}</span>
    </span>
  );
}
