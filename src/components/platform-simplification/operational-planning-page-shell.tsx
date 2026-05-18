"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { OperatorPageShell } from "@/components/ox/operator-page-shell";
import type { OperatorMode } from "@/lib/ox/operator-mode";
import {
  type TransitionalBannerVariant,
} from "@/components/platform-simplification/transitional-architecture-banner";

type Props = {
  routeContext: string;
  bannerVariant: TransitionalBannerVariant;
  readOnly?: boolean;
  usesDemoData?: boolean;
  usesSampleData?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

function modeForBanner(variant: TransitionalBannerVariant): OperatorMode {
  if (variant === "deprecated") return "diagnose";
  if (variant === "derived") return "diagnose";
  return "monitor";
}

const ROUTE_TITLES: Record<string, string> = {
  grid: "Forecast matrix",
  pipeline: "Pipeline",
  scenarios: "Scenario library",
};

const BODY_KEYS: Record<TransitionalBannerVariant, string> = {
  transitional: "bodyTransitional",
  derived: "bodyDerived",
  deprecated: "bodyDeprecated",
};

/** Wave 0 + OX: hydration gate + operator shell + dev warnings. */
export function OperationalPlanningPageShell({
  routeContext,
  bannerVariant,
  readOnly,
  usesDemoData,
  usesSampleData,
  loadingLabel,
  children,
}: Props) {
  const tArch = useTranslations("architectureCleanup");

  return (
    <OperatorPageShell
      routeContext={routeContext}
      title={ROUTE_TITLES[routeContext] ?? routeContext}
      purpose={tArch(BODY_KEYS[bannerVariant] as never)}
      mode={modeForBanner(bannerVariant)}
      bannerVariant={bannerVariant}
      readOnly={readOnly ?? bannerVariant !== "transitional"}
      usesDemoData={usesDemoData}
      usesSampleData={usesSampleData}
      loadingLabel={loadingLabel}
      showWorkflowRail={false}
    >
      {children}
    </OperatorPageShell>
  );
}
