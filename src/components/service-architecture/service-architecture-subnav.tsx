"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/service-architecture", key: "tabFamilies" as const, match: (p: string) => p === "/service-architecture" },
  {
    href: "/service-architecture/templates",
    key: "tabTemplates" as const,
    match: (p: string) => p.startsWith("/service-architecture/templates"),
  },
  {
    href: "/service-architecture/phases",
    key: "tabPhases" as const,
    match: (p: string) => p.startsWith("/service-architecture/phases"),
  },
  {
    href: "/service-architecture/deliverables",
    key: "tabDeliverables" as const,
    match: (p: string) => p.startsWith("/service-architecture/deliverables"),
  },
  {
    href: "/service-architecture/role-allocation-matrix",
    key: "tabMatrix" as const,
    match: (p: string) => p.startsWith("/service-architecture/role-allocation-matrix"),
  },
  {
    href: "/service-architecture/cost-intelligence",
    key: "tabCostIntel" as const,
    match: (p: string) => p.startsWith("/service-architecture/cost-intelligence"),
  },
  {
    href: "/service-architecture/commercial-pricing",
    key: "tabCommercialPricing" as const,
    match: (p: string) => p.startsWith("/service-architecture/commercial-pricing"),
    highlight: true,
  },
];

export function ServiceArchitectureSubnav() {
  const t = useTranslations("serviceArchitecture");
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-border/60 pb-3">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link key={tab.href} href={tab.href}>
            <span
              className={cn(
                "inline-flex rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                tab.highlight && !active && "ring-1 ring-violet-500/40"
              )}
            >
              {t(tab.key)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

