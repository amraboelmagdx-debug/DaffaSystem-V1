"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { OperationalBuToolbar } from "@/components/operational-workspace/operational-bu-toolbar";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { BuContextGate } from "@/components/operational-workspace/bu-context-gate";
import { ServiceArchitectureSubnav } from "@/components/service-architecture/service-architecture-subnav";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";

export function ServiceArchitectureShell({ children }: { children: ReactNode }) {
  const tDash = useTranslations("dashboard");
  const tSa = useTranslations("serviceArchitecture");
  const { isReady, linkedUnits, hrActiveBuCount, selectedUnit } = useOperationalWorkspace();

  const showEmptyLinked =
    isReady && hrActiveBuCount > 0 && linkedUnits.length === 0;

  return (
    <div className="mx-auto max-w-[1440px] space-y-2 p-4 md:p-8">
      <OperationalWorkspaceGate loadingLabel={tSa("loadingWorkspace")}>
        <ServiceArchitectureSubnav />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <OperationalBuToolbar />
          {selectedUnit?.name ? (
            <p className="text-xs text-muted-foreground">
              {tSa("activeBuContext", { name: selectedUnit.name })}
            </p>
          ) : null}
        </div>
        {showEmptyLinked ? (
          <div className="mx-auto max-w-2xl space-y-3 py-12 text-center">
            <p className="text-sm font-medium text-foreground">{tDash("emptyLinkedUnits")}</p>
            <p className="text-xs text-muted-foreground">{tDash("emptyLinkedUnitsHint")}</p>
          </div>
        ) : (
          <BuContextGate>{children}</BuContextGate>
        )}
      </OperationalWorkspaceGate>
    </div>
  );
}
