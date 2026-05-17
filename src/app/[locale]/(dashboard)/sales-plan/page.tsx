"use client";

import dynamic from "next/dynamic";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";

const SalesPlanWizard = dynamic(
  () =>
    import("@/components/sales-plan/sales-plan-wizard").then((m) => m.SalesPlanWizard),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    ),
  }
);

export default function SalesPlanPage() {
  return (
    <div className="space-y-4">
      <SampleDataPanel moduleId="sales-plan-wizard" />
      <SampleDataPanel moduleId="workspace" className="border-dashed" />
      <SalesPlanWizard />
    </div>
  );
}
