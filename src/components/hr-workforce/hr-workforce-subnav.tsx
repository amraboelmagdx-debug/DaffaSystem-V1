"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";

const tabs = [
  { slug: "", key: "tabOverview" as const },
  { slug: "/intelligence", key: "tabIntelligence" as const },
  { slug: "/roles", key: "tabRoles" as const },
  { slug: "/settings", key: "tabSettings" as const },
  { slug: "/import", key: "tabImport" as const },
];

export function HrWorkforceSubnav() {
  const t = useTranslations("hrWorkforce");
  const pathname = usePathname();
  const { buildHref } = useUnitRouteContext();

  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-border/60 pb-3">
      {tabs.map((tab) => {
        const href = buildHref(`/hr-workforce${tab.slug}`);
        const active = tab.slug === ""
          ? pathname.endsWith("/hr-workforce")
          : pathname.includes(`/hr-workforce${tab.slug}`);
        return (
          <Link key={href} href={href}>
            <span
              className={cn(
                "inline-flex rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
