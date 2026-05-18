"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SetActiveBuDialog({
  open,
  unitName,
  onOpenChange,
  onConfirm,
  onDecline,
}: {
  open: boolean;
  unitName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const t = useTranslations("hrWorkforce.setActiveBu");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("body", { name: unitName })}</p>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onDecline}>
            {t("no")}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {t("yes")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
