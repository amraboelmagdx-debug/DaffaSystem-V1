"use client";

import type { ReactNode } from "react";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { OperationalUnitPicker } from "@/components/operational-workspace/operational-unit-picker";

type Props = {
  children: ReactNode;
};

/**
 * Blocks operational modules until an HR-linked business unit is explicitly selected.
 * Holding board and unit portal do not use this gate.
 */
export function BuContextGate({ children }: Props) {
  const { hasExplicitOperationalContext, isReady } = useOperationalWorkspace();

  if (!isReady) {
    return <OperationalWorkspaceGate>{null}</OperationalWorkspaceGate>;
  }

  if (hasExplicitOperationalContext) {
    return <>{children}</>;
  }

  return (
    <OperationalWorkspaceGate>
      <OperationalUnitPicker />
    </OperationalWorkspaceGate>
  );
}
