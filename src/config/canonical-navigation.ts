import type { LucideIcon } from "lucide-react";

import {

  BarChart3,

  Calculator,

  FlaskConical,

  Building2,
  Grid3x3,

  LayoutDashboard,

  Layers,

  MessageSquare,

  Rocket,

  Settings2,

  Target,

  Trophy,

  Users2,

  Workflow,

} from "lucide-react";



export type NavTranslationKey =

  | "executive"

  | "salesPlan"

  | "salesIncentives"

  | "serviceArchitecture"

  | "calculator"

  | "hrWorkforce"

  | "settings"

  | "grid"

  | "scenarios"

  | "pipeline"

  | "assistant"

  | "getStarted"

  | "testLab"

  | "holding";



export type NavGroupKey = "operate" | "foundation" | "system" | "advanced";



export type CanonicalNavItem = {

  href: string;

  key: NavTranslationKey;

  icon: LucideIcon;

  advanced?: boolean;

};



export type CanonicalNavGroup = {

  groupKey: NavGroupKey;

  labelKey: string;

  items: CanonicalNavItem[];

};



/** Operate — day-to-day monitoring and planning. */

export const operateNav: CanonicalNavItem[] = [

  { href: "/holding", key: "holding", icon: Building2 },

  { href: "/", key: "executive", icon: LayoutDashboard },

  { href: "/sales-plan", key: "salesPlan", icon: Target },

  { href: "/sales-incentives", key: "salesIncentives", icon: Trophy },

];



/** Foundation — structure and economics inputs. */

export const foundationNav: CanonicalNavItem[] = [

  { href: "/hr-workforce", key: "hrWorkforce", icon: Users2 },

  { href: "/service-architecture", key: "serviceArchitecture", icon: Layers },

  {

    href: "/service-architecture/commercial-pricing",

    key: "calculator",

    icon: Calculator,

  },

];



/** System — tenant, onboarding, testing. */

export const systemNav: CanonicalNavItem[] = [

  { href: "/get-started", key: "getStarted", icon: Rocket },

  { href: "/test-lab", key: "testLab", icon: FlaskConical },

  { href: "/settings", key: "settings", icon: Settings2 },

];



export const advancedNav: CanonicalNavItem[] = [

  { href: "/grid", key: "grid", icon: Grid3x3, advanced: true },

  { href: "/scenarios", key: "scenarios", icon: BarChart3, advanced: true },

  { href: "/pipeline", key: "pipeline", icon: Workflow, advanced: true },

  { href: "/assistant", key: "assistant", icon: MessageSquare, advanced: true },

];



/** @deprecated Use operateNav — kept for command palette ordering. */

export const primaryNav: CanonicalNavItem[] = [

  ...operateNav,

  ...foundationNav.filter((i) => i.key !== "calculator"),

  foundationNav.find((i) => i.key === "calculator")!,

  { href: "/settings", key: "settings", icon: Settings2 },

];



export const navGroups: CanonicalNavGroup[] = [

  { groupKey: "operate", labelKey: "operateGroup", items: operateNav },

  { groupKey: "foundation", labelKey: "foundationGroup", items: foundationNav },

  { groupKey: "system", labelKey: "systemGroup", items: systemNav },

];



/** All routes reachable from command palette. */

export const commandNav: CanonicalNavItem[] = [

  ...operateNav,

  ...foundationNav,

  ...systemNav,

  ...advancedNav,

];



const NAV_GROUP_LABEL_KEYS: Record<NavGroupKey, string> = {

  operate: "operateGroup",

  foundation: "foundationGroup",

  system: "systemGroup",

  advanced: "advancedGroup",

};



export function navGroupLabelKey(group: NavGroupKey): string {

  return NAV_GROUP_LABEL_KEYS[group];

}



export function isNavItemActive(pathname: string, href: string): boolean {

  if (href === "/holding") return pathname.startsWith("/holding");

  if (href === "/") return pathname === "/";

  if (href === "/sales-plan") return pathname.startsWith("/sales-plan");

  if (href === "/sales-incentives") return pathname.startsWith("/sales-incentives");

  if (href === "/hr-workforce") return pathname.startsWith("/hr-workforce");

  if (href === "/get-started") return pathname.startsWith("/get-started");

  if (href === "/test-lab") return pathname.startsWith("/test-lab");

  if (href === "/service-architecture/commercial-pricing") {

    return pathname.startsWith("/service-architecture/commercial-pricing");

  }

  if (href === "/service-architecture") {

    return (

      pathname.startsWith("/service-architecture") &&

      !pathname.startsWith("/service-architecture/commercial-pricing")

    );

  }

  return pathname.startsWith(href);

}


