"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

/** Sets workspace company; on unit routes also updates the URL segment. */
export function useNavigateUnitCompany() {
  const router = useRouter();
  const pathname = usePathname();
  const { prefix, isUnitScoped } = useUnitRouteContext();
  const setCompany = useWorkspaceStore((s) => s.setCompany);

  return useCallback(
    (nextCompanyId: string) => {
      if (!nextCompanyId.trim()) return;
      setCompany(nextCompanyId);
      if (isUnitScoped && prefix) {
        const tail = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
        router.push(`/unit/${nextCompanyId}${tail}`);
      }
    },
    [isUnitScoped, prefix, pathname, router, setCompany]
  );
}
