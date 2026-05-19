"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { persistNewBusinessUnitAndSync } from "@/lib/hr-workforce/add-business-unit-flow";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddBusinessUnitDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("holding.addBu");
  const tHr = useTranslations("hrWorkforce");
  const router = useRouter();
  const addBusinessUnit = useHrWorkforceStore((s) => s.addBusinessUnit);
  const setCompany = useWorkspaceStore((s) => s.setCompany);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCode("");
    setError(null);
    setBusy(false);
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const created = addBusinessUnit({ name: trimmed, code: code.trim() });
    const result = await persistNewBusinessUnitAndSync(created);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? tHr("addBuFailed"));
      return;
    }
    if (result.companyId) {
      setCompany(result.companyId);
      router.push(`/unit/${result.companyId}`);
    }
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("body")}</p>
          <div className="space-y-2">
            <Label htmlFor="add-bu-name">{t("nameLabel")}</Label>
            <Input
              id="add-bu-name"
              dir="auto"
              autoFocus
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !busy) {
                  void handleSubmit();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-bu-code">{t("codeLabel")}</Label>
            <Input
              id="add-bu-code"
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
              onClick={() => void handleSubmit()}
              disabled={busy || !name.trim()}
            >
              {busy ? t("creating") : t("create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
