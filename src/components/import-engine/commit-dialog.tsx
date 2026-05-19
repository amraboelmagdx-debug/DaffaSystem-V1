"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ImportChangeSummaryRow } from "@/lib/import-engine/types";

interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  changeSummary?: ImportChangeSummaryRow[];
  busy?: boolean;
}

export function CommitDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Apply import?",
  description = "Review the summary below. This action will update your live workspace data.",
  confirmLabel = "Apply changes",
  cancelLabel = "Cancel",
  changeSummary,
  busy,
}: CommitDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {changeSummary && changeSummary.length ? (
          <div className="rounded-md border bg-muted/20 p-3">
            <ul className="space-y-1 text-xs">
              {changeSummary.map((r) => (
                <li key={r.entity} className="flex items-center justify-between">
                  <span className="font-medium">{r.entity}</span>
                  <span className="tabular-nums text-muted-foreground">
                    +{r.inserts} new · ~{r.updates} updated
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={busy}
          >
            {busy ? "Applying…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
