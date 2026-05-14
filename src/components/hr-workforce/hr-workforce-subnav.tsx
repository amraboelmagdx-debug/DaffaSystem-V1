"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/hr-workforce", key: "tabOverview" as const, match: (p: string) => p === "/hr-workforce" },
  { href: "/hr-workforce/roles", key: "tabRoles" as const, match: (p: string) => p.startsWith("/hr-workforce/roles") },
  { href: "/hr-workforce/settings", key: "tabSettings" as const, match: (p: string) => p.startsWith("/hr-workforce/settings") },
  { href: "/hr-workforce/import", key: "tabImport" as const, match: (p: string) => p.startsWith("/hr-workforce/import") },
];

export function HrWorkforceSubnav() {
  const t = useTranslations("hrWorkforce");
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
