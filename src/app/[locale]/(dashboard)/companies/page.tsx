"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/** Transitional route — company/scenario authoring lives in Sales Plan. */
export default function CompaniesRedirectPage() {
  const router = useRouter();
  const t = useTranslations("architectureCleanup");
  const [shown] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => router.replace("/sales-plan"), 1200);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
      {shown ? (
        <p className="max-w-md text-sm text-muted-foreground">{t("redirectToSalesPlan")}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("redirecting")}</p>
    </div>
  );
}
