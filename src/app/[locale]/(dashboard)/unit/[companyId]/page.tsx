"use client";

import { use } from "react";
import { UnitPortal } from "@/components/holding/unit-portal";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";

type Props = {
  params: Promise<{ companyId: string }>;
};

export default function UnitPortalPage({ params }: Props) {
  const { companyId } = use(params);

  return (
    <OperationalWorkspaceGate>
      <UnitPortal companyId={companyId} />
    </OperationalWorkspaceGate>
  );
}
