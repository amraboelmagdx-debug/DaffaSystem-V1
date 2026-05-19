"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";

/**
 * Locale root → /holding (or last visited unit when one is already selected).
 *
 * Each operational module now lives under /unit/[companyId]/..., so the legacy
 * "global executive dashboard" entry point sends users back to the holding
 * board to pick a unit.
 */
export default function DashboardRoot() {
  const router = useRouter();
  const { isReady, selectedCompanyId, linkedUnits } = useOperationalWorkspace();

  useEffect(() => {
    if (!isReady) return;
    if (selectedCompanyId && linkedUnits.some((u) => u.id === selectedCompanyId)) {
      router.replace(`/unit/${selectedCompanyId}`);
      return;
    }
    router.replace("/holding");
  }, [isReady, selectedCompanyId, linkedUnits, router]);

  return null;
}
