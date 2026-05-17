"use client";

import dynamic from "next/dynamic";

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
  return <SalesPlanWizard />;
}
