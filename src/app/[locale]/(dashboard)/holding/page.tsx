"use client";

import { HoldingBoard } from "@/components/holding/holding-board";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";

export default function HoldingPage() {
  return (
    <OperationalWorkspaceGate>
      <HoldingBoard />
    </OperationalWorkspaceGate>
  );
}
