"use client";

import type { ReactNode } from "react";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { OperationalUnitPicker } from "@/components/operational-workspace/operational-unit-picker";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";

type Props = {
  children: ReactNode;
};

/**
 * Blocks operational modules until an HR-linked business unit is explicitly selected.
 *
 * Short-circuits on /unit/[id]/... routes — the URL itself is the source of
 * truth there and UnitContextProvider keeps the store in sync.
 */
export function BuContextGate({ children }: Props) {
  const { hasExplicitOperationalContext, isReady } = useOperationalWorkspace();
  const { isUnitScoped } = useUnitRouteContext();

  if (!isReady) {
    return <OperationalWorkspaceGate>{null}</OperationalWorkspaceGate>;
  }

  if (isUnitScoped || hasExplicitOperationalContext) {
    return <>{children}</>;
  }

  return (
    <OperationalWorkspaceGate>
      <OperationalUnitPicker />
    </OperationalWorkspaceGate>
  );
}
