"use client";

import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

/** Shown when catalog has no active roles; full panel lives in HR layout. */
export function HrWorkforceDemoSeedBanner() {
  const hasActiveRoles = useHrWorkforceStore((s) => s.roles.some((r) => !r.archived));
  if (hasActiveRoles) return null;
  return (
    <SampleDataPanel
      moduleId="hr-workforce"
      className="border-amber-500/25 bg-amber-500/[0.04]"
    />
  );
}
