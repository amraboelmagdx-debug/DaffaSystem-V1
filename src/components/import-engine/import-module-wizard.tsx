"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { ensureImportAdaptersRegistered } from "@/lib/import-engine/register-adapters";
import { getImportAdapter } from "@/lib/import-engine";
import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { ImportWizard } from "./import-wizard";

interface ImportModuleWizardProps {
  moduleId: string;
}

export function ImportModuleWizard({ moduleId }: ImportModuleWizardProps) {
  const t = useTranslations("importEngine");
  const locale = useLocale();
  const { organizationId, organizationName } = useTenantPersistenceContext();
  ensureImportAdaptersRegistered();
  const adapter = getImportAdapter(moduleId);

  if (!adapter) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Link
          href={`/${locale}/import-export`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("hub.backToHub")}
        </Link>
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/${locale}/import-export`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        {t("hub.backToHub")}
      </Link>
      <ImportWizard
        adapter={adapter}
        organizationId={organizationId}
        organizationName={organizationName}
      />
    </div>
  );
}
