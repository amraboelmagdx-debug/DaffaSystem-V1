"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";

type Props = {
  /** Slug appended after /unit/[companyId]. Use "" for the unit root. */
  unitSlug: string;
};

/**
 * Legacy flat routes (e.g. /hr-workforce) now redirect to their unit-scoped
 * equivalent (/unit/[lastUnitId]/hr-workforce). When no BU is selected, falls
 * back to /holding so the user can pick one explicitly.
 */
export function LegacyFlatRouteRedirect({ unitSlug }: Props) {
  const router = useRouter();
  const { isReady, selectedCompanyId, linkedUnits } = useOperationalWorkspace();

  useEffect(() => {
    if (!isReady) return;
    const targetId =
      selectedCompanyId &&
      linkedUnits.some((u) => u.id === selectedCompanyId)
        ? selectedCompanyId
        : linkedUnits[0]?.id;
    if (targetId) {
      router.replace(`/unit/${targetId}${unitSlug}`);
      return;
    }
    router.replace("/holding");
  }, [isReady, selectedCompanyId, linkedUnits, router, unitSlug]);

  return null;
}
