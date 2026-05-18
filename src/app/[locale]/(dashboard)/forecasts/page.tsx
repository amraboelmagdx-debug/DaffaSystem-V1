"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/** Transitional route — canonical forecast UI lives on Executive (#rolling-forecast). */
export default function ForecastsRedirectPage() {
  const router = useRouter();
  const t = useTranslations("architectureCleanup");
  const [shown] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => router.replace("/#rolling-forecast"), 1200);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
      {shown ? (
        <p className="max-w-md text-sm text-muted-foreground">{t("redirectToExecutiveForecast")}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("redirecting")}</p>
    </div>
  );
}
