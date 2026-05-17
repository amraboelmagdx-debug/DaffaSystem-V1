"use client";

import { useEffect } from "react";
import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import {
  emitWave0DevWarnings,
  type Wave0DevWarningInput,
} from "@/lib/platform-simplification/wave0-dev-warnings";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

/** Developer-only console warnings for Wave 0 (no user-facing behavior change). */
export function useWave0DevWarnings(routeContext: Wave0DevWarningInput["routeContext"]): void {
  const { organizationId } = useTenantPersistenceContext();
  const companies = useWorkspaceStore((s) => s.companies);
  const selectedCompanyId = useWorkspaceStore((s) => s.selectedCompanyId);

  useEffect(() => {
    emitWave0DevWarnings({
      routeContext,
      companies,
      organizationId,
      selectedCompanyId,
    });
  }, [routeContext, companies, organizationId, selectedCompanyId]);
}
