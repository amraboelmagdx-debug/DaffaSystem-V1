"use client";

import { HrWorkforceDemoSeedBanner } from "@/components/hr-workforce/hr-workforce-demo-seed-banner";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";
import { isSampleDataUxEnabled } from "@/lib/ox/sample-data-access";

/**
 * Dev/pilot: full sample panel (load, clear, reset) whenever sample UX is enabled.
 * Production: empty-state-only banner via {@link HrWorkforceDemoSeedBanner}.
 */
export function HrWorkforceSampleDataSlot() {
  if (isSampleDataUxEnabled()) {
    return (
      <SampleDataPanel
        moduleId="hr-workforce"
        className="border-muted/60 bg-muted/20"
      />
    );
  }
  return <HrWorkforceDemoSeedBanner />;
}
