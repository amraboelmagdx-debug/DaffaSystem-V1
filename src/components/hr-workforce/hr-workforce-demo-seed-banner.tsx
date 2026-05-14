"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

export function HrWorkforceDemoSeedBanner() {
  const t = useTranslations("hrWorkforce");
  const roles = useHrWorkforceStore((s) => s.roles);
  const seedDemoWorkforce = useHrWorkforceStore((s) => s.seedDemoWorkforce);
  const hasActiveRoles = roles.some((r) => !r.archived);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<"done" | "error" | null>(null);
  const [rolesAdded, setRolesAdded] = useState(0);

  if (hasActiveRoles) return null;

  const onLoad = () => {
    setNotice(null);
    setBusy(true);
    try {
      const r = seedDemoWorkforce();
      if (r.ok) {
        setRolesAdded(r.rolesAdded);
        setNotice("done");
      } else {
        setNotice("error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-amber-500/25 bg-amber-500/[0.04]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("demoSeedTitle")}</CardTitle>
        <CardDescription>{t("demoSeedDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" onClick={onLoad} disabled={busy}>
            {busy ? t("demoSeedLoading") : t("demoSeedCta")}
          </Button>
        </div>
        {notice === "done" ? (
          <p className="text-sm text-muted-foreground">{t("demoSeedDone", { count: rolesAdded })}</p>
        ) : null}
        {notice === "error" ? (
          <p className="text-sm text-amber-800 dark:text-amber-200/90">{t("demoSeedFailed")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
