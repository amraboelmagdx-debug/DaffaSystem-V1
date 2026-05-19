import type { LucideIcon } from "lucide-react";
import {
  Building2,
  FlaskConical,
  MessageSquare,
  Rocket,
  Settings2,
} from "lucide-react";
import type { NavTranslationKey } from "./canonical-navigation";

export type HoldingNavItem = {
  href: string;
  key: NavTranslationKey;
  icon: LucideIcon;
};

/** Nav shown when on /holding/* (and other tenant-level routes). */
export const holdingNav: HoldingNavItem[] = [
  { href: "/holding", key: "holding", icon: Building2 },
  { href: "/get-started", key: "getStarted", icon: Rocket },
  { href: "/test-lab", key: "testLab", icon: FlaskConical },
  { href: "/settings", key: "settings", icon: Settings2 },
  { href: "/assistant", key: "assistant", icon: MessageSquare },
];

export function isHoldingNavItemActive(pathname: string, href: string): boolean {
  if (href === "/holding") {
    return pathname === "/holding" || pathname.startsWith("/holding/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
