"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";

const tabs = [
  { slug: "", key: "tabFamilies" as const },
  { slug: "/templates", key: "tabTemplates" as const },
  { slug: "/phases", key: "tabPhases" as const },
  { slug: "/deliverables", key: "tabDeliverables" as const },
  { slug: "/role-allocation-matrix", key: "tabMatrix" as const },
  { slug: "/cost-intelligence", key: "tabCostIntel" as const },
  {
    slug: "/commercial-pricing",
    key: "tabCommercialPricing" as const,
    highlight: true,
  },
];

export function ServiceArchitectureSubnav() {
  const t = useTranslations("serviceArchitecture");
  const pathname = usePathname();
  const { buildHref } = useUnitRouteContext();

  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-border/60 pb-3">
      {tabs.map((tab) => {
        const href = buildHref(`/service-architecture${tab.slug}`);
        const active = tab.slug === ""
          ? pathname.endsWith("/service-architecture")
          : pathname.includes(`/service-architecture${tab.slug}`);
        return (
          <Link key={href} href={href}>
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

