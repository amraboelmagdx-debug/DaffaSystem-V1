"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { persistDeleteBusinessUnitAndSync } from "@/lib/hr-workforce/delete-business-unit-flow";

export type DeleteBusinessUnitTarget = {
  hrBusinessUnitId: string;
  name: string;
};

type Props = {
  target: DeleteBusinessUnitTarget | null;
  onOpenChange: (open: boolean) => void;
};

export function DeleteBusinessUnitDialog({ target, onOpenChange }: Props) {
  const t = useTranslations("holding.deleteBu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!target) return;
    setBusy(true);
    setError(null);
    const result = await persistDeleteBusinessUnitAndSync(target.hrBusinessUnitId);
    setBusy(false);
    if (!result.ok) {
      if (result.errorCode === "cannot_delete_last") {
        setError(t("cannotDeleteLast"));
      } else {
        setError(result.error ?? t("failed"));
      }
      return;
    }
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={target != null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          setBusy(false);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {target ? t("body", { name: target.name }) : null}
          </p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirm()}
              disabled={busy || !target}
            >
              {busy ? t("deleting") : t("confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
