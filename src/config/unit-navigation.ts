import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Layers,
  LayoutDashboard,
  Target,
  Trophy,
  Users2,
} from "lucide-react";
import type { NavTranslationKey } from "./canonical-navigation";

export type UnitNavItem = {
  /** Slug relative to /unit/[companyId]. Use "" for the BU dashboard root. */
  slug: string;
  key: NavTranslationKey;
  icon: LucideIcon;
};

/** Nav shown when on /unit/[companyId]/*. */
export const unitNav: UnitNavItem[] = [
  { slug: "", key: "executive", icon: LayoutDashboard },
  { slug: "/hr-workforce", key: "hrWorkforce", icon: Users2 },
  { slug: "/service-architecture", key: "serviceArchitecture", icon: Layers },
  {
    slug: "/service-architecture/commercial-pricing",
    key: "calculator",
    icon: Calculator,
  },
  { slug: "/sales-plan", key: "salesPlan", icon: Target },
  { slug: "/sales-incentives", key: "salesIncentives", icon: Trophy },
];

export function unitHref(companyId: string, slug: string): string {
  return `/unit/${companyId}${slug}`;
}

export function isUnitNavItemActive(
  pathname: string,
  companyId: string,
  slug: string
): boolean {
  const base = `/unit/${companyId}`;
  if (slug === "") return pathname === base;
  if (slug === "/service-architecture") {
    return (
      pathname.startsWith(`${base}/service-architecture`) &&
      !pathname.startsWith(`${base}/service-architecture/commercial-pricing`)
    );
  }
  if (slug === "/service-architecture/commercial-pricing") {
    return pathname.startsWith(
      `${base}/service-architecture/commercial-pricing`
    );
  }
  return pathname.startsWith(`${base}${slug}`);
}
