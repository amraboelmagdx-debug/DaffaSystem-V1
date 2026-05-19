"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";
import {
  holdingNav,
  isHoldingNavItemActive,
} from "@/config/holding-navigation";
import {
  isUnitNavItemActive,
  unitHref,
  unitNav,
} from "@/config/unit-navigation";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

type Props = {
  collapsed: boolean;
};

export function SidebarNavRouter({ collapsed }: Props) {
  const { isUnitScoped } = useUnitRouteContext();
  if (isUnitScoped) {
    return <UnitSidebar collapsed={collapsed} />;
  }
  return <HoldingSidebar collapsed={collapsed} />;
}

function HoldingSidebar({ collapsed }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {holdingNav.map((item) => {
        const Icon = item.icon;
        const active = isHoldingNavItemActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
                active
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {!collapsed && t(item.key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function UnitSidebar({ collapsed }: Props) {
  const t = useTranslations("nav");
  const tH = useTranslations("holding");
  const pathname = usePathname();
  const { companyId } = useUnitRouteContext();
  const { linkedUnits } = useOperationalWorkspace();
  const unit = linkedUnits.find((u) => u.id === companyId);
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const hrBu =
    unit?.hrBusinessUnitId
      ? businessUnits.find((b) => b.id === unit.hrBusinessUnitId)
      : undefined;
  const unitLabel = hrBu?.name ?? unit?.name ?? "";

  if (!companyId) return null;

  return (
    <nav className="flex flex-col gap-0.5">
      <Link href="/holding">
        <span
          className={cn(
            "mb-2 flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
            "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <ArrowLeft className="h-4 w-4 shrink-0 opacity-80" />
          {!collapsed && tH("unitPortal.backToHolding")}
        </span>
      </Link>
      {!collapsed && unitLabel ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-2 text-xs">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate font-medium">{unitLabel}</span>
        </div>
      ) : null}
      {unitNav.map((item) => {
        const Icon = item.icon;
        const href = unitHref(companyId, item.slug);
        const active = isUnitNavItemActive(pathname, companyId, item.slug);
        return (
          <Link key={item.slug || "__root"} href={href}>
            <span
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
                active
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {!collapsed && t(item.key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
