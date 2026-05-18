"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  advancedNav,
  isNavItemActive,
  navGroups,
  navGroupLabelKey,
  type CanonicalNavItem,
  type NavGroupKey,
} from "@/config/canonical-navigation";

function NavLink({
  item,
  collapsed,
  pathname,
}: {
  item: CanonicalNavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const t = useTranslations("nav");
  const active = isNavItemActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link href={item.href}>
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
}

function NavGroupSection({
  groupKey,
  labelKey,
  items,
  collapsed,
  pathname,
}: {
  groupKey: NavGroupKey;
  labelKey: string;
  items: CanonicalNavItem[];
  collapsed: boolean;
  pathname: string;
}) {
  const t = useTranslations("nav");
  if (collapsed) {
    return (
      <>
        {items.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
      </>
    );
  }

  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t(labelKey as never)}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

export function CanonicalSidebarNav({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [advancedOpen, setAdvancedOpen] = useState(() =>
    advancedNav.some((item) => isNavItemActive(pathname, item.href))
  );

  return (
    <nav className="flex flex-col gap-0.5">
      {navGroups.map((group) => (
        <NavGroupSection
          key={group.groupKey}
          groupKey={group.groupKey}
          labelKey={navGroupLabelKey(group.groupKey)}
          items={group.items}
          collapsed={collapsed}
          pathname={pathname}
        />
      ))}
      {!collapsed ? (
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="mt-3 flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/40"
        >
          {t("advancedGroup")}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")}
          />
        </button>
      ) : null}
      {(advancedOpen || collapsed) &&
        advancedNav.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
    </nav>
  );
}
