"use client";

import { useMemo } from "react";
import { usePathname } from "@/i18n/navigation";

const UNIT_PREFIX_RE = /^\/unit\/([^/]+)(?:\/(.*))?$/;

export type UnitRouteContext = {
  /** Returns the BU id if the current URL is /unit/[id]/..., else null. */
  companyId: string | null;
  /** "/unit/<id>" if inside a unit, else "". */
  prefix: string;
  /** Whether the current pathname is unit-scoped. */
  isUnitScoped: boolean;
  /**
   * Build a unit-scoped href. If currently inside a unit context, prepends
   * "/unit/<id>" to the given path. If not, returns the path as-is.
   */
  buildHref: (path: string) => string;
};

export function useUnitRouteContext(): UnitRouteContext {
  const pathname = usePathname();

  return useMemo(() => {
    const match = pathname.match(UNIT_PREFIX_RE);
    const companyId = match?.[1] ?? null;
    const prefix = companyId ? `/unit/${companyId}` : "";
    const isUnitScoped = Boolean(companyId);

    const buildHref = (path: string) => {
      if (!isUnitScoped) return path;
      if (path.startsWith("/unit/")) return path;
      if (!path.startsWith("/")) return path;
      return `${prefix}${path}`;
    };

    return { companyId, prefix, isUnitScoped, buildHref };
  }, [pathname]);
}
