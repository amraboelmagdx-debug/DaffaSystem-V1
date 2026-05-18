"use client";

import type { ReactNode } from "react";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import {
  TransitionalArchitectureBanner,
  type TransitionalBannerVariant,
} from "@/components/platform-simplification/transitional-architecture-banner";
import { PagePurposeHeader } from "@/components/ox/page-purpose-header";
import { OperationalBreadcrumbs } from "@/components/ox/operational-breadcrumbs";
import { WorkflowProgressRail } from "@/components/ox/workflow-progress-rail";
import { NextRecommendedAction } from "@/components/ox/next-recommended-action";
import type { OperatorMode } from "@/lib/ox/operator-mode";
import { useWave0DevWarnings } from "@/hooks/use-wave0-dev-warnings";
import { cn } from "@/lib/utils";

type Props = {
  routeContext: string;
  title: string;
  purpose: string;
  mode: OperatorMode;
  bannerVariant?: TransitionalBannerVariant;
  readOnly?: boolean;
  usesDemoData?: boolean;
  usesSampleData?: boolean;
  loadingLabel?: string;
  showWorkflowRail?: boolean;
  showNextAction?: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function OperatorPageShell({
  routeContext,
  title,
  purpose,
  mode,
  bannerVariant,
  readOnly,
  usesDemoData,
  usesSampleData,
  loadingLabel,
  showWorkflowRail = false,
  showNextAction = false,
  headerActions,
  children,
  className,
}: Props) {
  useWave0DevWarnings(routeContext);

  return (
    <OperationalWorkspaceGate loadingLabel={loadingLabel}>
      <div className={cn("space-y-8", className)} data-operator-mode={mode}>
        <OperationalBreadcrumbs />
        {showWorkflowRail ? (
          <div className="rounded-lg border border-border/50 bg-card/30 p-3">
            <WorkflowProgressRail />
          </div>
        ) : null}
        <PagePurposeHeader
          title={title}
          purpose={purpose}
          mode={mode}
          actions={headerActions}
        />
        {showNextAction ? <NextRecommendedAction /> : null}
        {bannerVariant ? (
          <TransitionalArchitectureBanner
            variant={bannerVariant}
            readOnly={readOnly ?? mode === "monitor"}
            usesDemoData={usesDemoData}
            usesSampleData={usesSampleData}
          />
        ) : null}
        <div
          className={cn(readOnly || mode === "monitor" ? "[&_input]:pointer-events-none [&_textarea]:pointer-events-none [&_select]:pointer-events-none [&_button[data-edit]]:hidden" : undefined)}
        >
          {children}
        </div>
      </div>
    </OperationalWorkspaceGate>
  );
}
