"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { cn } from "@/lib/utils";

export function HrWorkforcePersistBar() {
  const t = useTranslations("hrWorkforce");
  const [last, setLast] = useState<Date | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setLast(new Date());
    let tid: number | undefined;
    const unsub = useHrWorkforceStore.subscribe(() => {
      setLast(new Date());
      setFlash(true);
      if (tid !== undefined) window.clearTimeout(tid);
      tid = window.setTimeout(() => setFlash(false), 1400);
    });
    return () => {
      unsub();
      if (tid !== undefined) window.clearTimeout(tid);
    };
  }, []);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      <span className="font-medium text-foreground">{t("persistTitle")}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-muted-foreground transition-colors",
          flash && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        )}
      >
        {flash ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        <span>
          {last ? t("persistLast", { time: last.toLocaleTimeString() }) : "—"}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">{t("persistAutosaveNote")}</span>
      <InsightBulb label={t("bulbPersistTitle")} description={t("bulbPersistBody")} />
    </div>
  );
}
