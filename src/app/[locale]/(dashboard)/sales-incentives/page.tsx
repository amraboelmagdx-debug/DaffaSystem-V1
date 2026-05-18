"use client";

import { SalesIncentivesWorkspace } from "@/components/incentives/sales-incentives-workspace";
import { BuContextGate } from "@/components/operational-workspace/bu-context-gate";

export default function SalesIncentivesPage() {
  return (
    <BuContextGate>
      <SalesIncentivesWorkspace />
    </BuContextGate>
  );
}
