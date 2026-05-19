"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";

type Props = {
  companyId: string;
  children: React.ReactNode;
};

/**
 * Wraps any /unit/[companyId]/... route. Reads the BU id from the URL params,
 * syncs it into the workspace store so all downstream hooks resolve the right
 * BU, and guards against unknown BU ids by rendering a "back to holding" card.
 *
 * URL = single source of truth for BU context.
 */
export function UnitContextProvider({ companyId, children }: Props) {
  const t = useTranslations("holding");
  const { linkedUnits, selectedCompanyId, setCompany, isReady } =
    useOperationalWorkspace();

  useEffect(() => {
    if (!companyId) return;
    if (selectedCompanyId === companyId) return;
    if (
      process.env.NODE_ENV === "development" &&
      selectedCompanyId &&
      selectedCompanyId !== companyId
    ) {
      console.warn("[unit-scope] Workspace company drifted from URL; resyncing", {
        urlCompanyId: companyId,
        storeCompanyId: selectedCompanyId,
      });
    }
    setCompany(companyId);
  }, [companyId, selectedCompanyId, setCompany]);

  const unitExists = useMemo(
    () => linkedUnits.some((u) => u.id === companyId),
    [linkedUnits, companyId]
  );

  if (!isReady) {
    return <OperationalWorkspaceGate>{null}</OperationalWorkspaceGate>;
  }

  if (linkedUnits.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-sm font-medium text-foreground">
          {t("emptyUnits")}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/holding">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("unitPortal.backToHolding")}
          </Link>
        </Button>
      </div>
    );
  }

  if (!unitExists) {
    notFound();
  }

  return <>{children}</>;
}
