"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { persistRenameBusinessUnitAndSync } from "@/lib/hr-workforce/rename-business-unit-flow";

export type RenameBusinessUnitTarget = {
  hrBusinessUnitId: string;
  name: string;
  code?: string;
};

type Props = {
  target: RenameBusinessUnitTarget | null;
  onOpenChange: (open: boolean) => void;
};

export function RenameBusinessUnitDialog({ target, onOpenChange }: Props) {
  const t = useTranslations("holding.renameBu");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setName(target.name);
      setCode(target.code ?? "");
      setError(null);
      setBusy(false);
    }
  }, [target]);

  async function handleSave() {
    if (!target) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("nameRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await persistRenameBusinessUnitAndSync({
      hrBusinessUnitId: target.hrBusinessUnitId,
      name: trimmed,
      code: code.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      if (result.errorCode === "name_required") {
        setError(t("nameRequired"));
      } else {
        setError(result.error ?? t("failed"));
      }
      return;
    }
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
          <p className="text-sm text-muted-foreground">{t("body")}</p>
          <div className="space-y-2">
            <Label htmlFor="rename-bu-name">{t("nameLabel")}</Label>
            <Input
              id="rename-bu-name"
              dir="auto"
              autoFocus
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !busy) {
                  void handleSave();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rename-bu-code">{t("codeLabel")}</Label>
            <Input
              id="rename-bu-code"
              placeholder={t("codePlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
          </div>
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
              onClick={() => void handleSave()}
              disabled={busy || !name.trim()}
            >
              {busy ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
