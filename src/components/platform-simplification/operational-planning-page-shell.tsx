"use client";

import type { ReactNode } from "react";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import {
  TransitionalArchitectureBanner,
  type TransitionalBannerVariant,
} from "@/components/platform-simplification/transitional-architecture-banner";
import { useWave0DevWarnings } from "@/hooks/use-wave0-dev-warnings";

type Props = {
  routeContext: string;
  bannerVariant: TransitionalBannerVariant;
  readOnly?: boolean;
  usesDemoData?: boolean;
  usesSampleData?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

/** Wave 0: hydration gate + visibility banner + dev console warnings (no routing or data changes). */
export function OperationalPlanningPageShell({
  routeContext,
  bannerVariant,
  readOnly,
  usesDemoData,
  usesSampleData,
  loadingLabel,
  children,
}: Props) {
  useWave0DevWarnings(routeContext);

  return (
    <OperationalWorkspaceGate loadingLabel={loadingLabel}>
      <div className="space-y-6">
        <TransitionalArchitectureBanner
          variant={bannerVariant}
          readOnly={readOnly}
          usesDemoData={usesDemoData}
          usesSampleData={usesSampleData}
        />
        {children}
      </div>
    </OperationalWorkspaceGate>
  );
}
