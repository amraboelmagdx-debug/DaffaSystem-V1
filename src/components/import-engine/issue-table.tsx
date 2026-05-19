"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { ImportIssue } from "@/lib/import-engine/types";
import { cn } from "@/lib/utils";

interface IssueTableProps {
  issues: ImportIssue[];
  maxRows?: number;
}

export function IssueTable({ issues, maxRows = 50 }: IssueTableProps) {
  if (!issues.length) {
    return (
      <p className="rounded-md border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        No issues detected.
      </p>
    );
  }
  const shown = issues.slice(0, maxRows);
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="w-12 px-3 py-2 text-start">Level</th>
            <th className="px-3 py-2 text-start">Sheet</th>
            <th className="w-16 px-3 py-2 text-start">Row</th>
            <th className="px-3 py-2 text-start">Message</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((i, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-3 py-2 align-top">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    i.level === "error" && "bg-destructive/15 text-destructive",
                    i.level === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                    i.level === "info" && "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                  )}
                >
                  {i.level === "error" ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : i.level === "warning" ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <Info className="h-3 w-3" />
                  )}
                  {i.level}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {i.sheet ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                {i.rowIndex ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs">{i.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {issues.length > maxRows ? (
        <p className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Showing first {maxRows} of {issues.length} issues.
        </p>
      ) : null}
    </div>
  );
}
