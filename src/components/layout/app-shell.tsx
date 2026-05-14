"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  BarChart3,
  Building2,
  Grid3x3,
  LayoutDashboard,
  Layers,
  LineChart,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Sun,
  Target,
  Users2,
  Workflow,
} from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUiStore } from "@/stores/use-ui-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { CommandMenu } from "@/components/command-menu";

const nav = [
  { href: "/", key: "executive" as const, icon: LayoutDashboard },
  { href: "/companies", key: "companies" as const, icon: Building2 },
  { href: "/forecasts", key: "forecasts" as const, icon: LineChart },
  { href: "/scenarios", key: "scenarios" as const, icon: BarChart3 },
  { href: "/pipeline", key: "pipeline" as const, icon: Workflow },
  { href: "/sales-plan", key: "salesPlan" as const, icon: Target },
  { href: "/hr-workforce", key: "hrWorkforce" as const, icon: Users2 },
  { href: "/service-architecture", key: "serviceArchitecture" as const, icon: Layers },
  { href: "/grid", key: "grid" as const, icon: Grid3x3 },
  { href: "/assistant", key: "assistant" as const, icon: MessageSquare },
  { href: "/settings", key: "settings" as const, icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const ts = useTranslations("shell");
  const pathname = usePathname();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const { sidebarCollapsed, toggleSidebar, setCommandOpen } = useUiStore();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useKeyboardShortcuts();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <CommandMenu />
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className="sticky top-0 hidden h-screen shrink-0 border-e border-border/60 bg-card/40 backdrop-blur-xl md:flex md:flex-col"
      >
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white shadow-lg shadow-violet-500/25">
            NX
          </div>
          {!sidebarCollapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">{ts("brand")}</p>
              <p className="text-[11px] text-muted-foreground">{ts("tagline")}</p>
            </div>
          )}
        </div>
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : item.href === "/sales-plan"
                    ? pathname.startsWith("/sales-plan")
                    : item.href === "/hr-workforce"
                      ? pathname.startsWith("/hr-workforce")
                      : item.href === "/service-architecture"
                        ? pathname.startsWith("/service-architecture")
                      : pathname.startsWith(item.href);
              const Icon = item.icon;
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
                    {!sidebarCollapsed && t(item.key)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="border-t border-border/60 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
            {!sidebarCollapsed && ts("collapse")}
          </Button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-sm font-semibold">{ts("brand")}</span>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-1 sm:inline-flex"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">⌘K</span>
            </Button>
            <div className="flex rounded-md border border-border/60 p-0.5">
              <Button
                variant={locale === "en" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2 text-xs"
                asChild
              >
                <Link href={pathname} locale="en">
                  EN
                </Link>
              </Button>
              <Button
                variant={locale === "ar" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2 text-xs"
                asChild
              >
                <Link href={pathname} locale="ar">
                  عربي
                </Link>
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              aria-label={ts("toggleTheme")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {!themeMounted ? (
                <span className="block h-4 w-4 shrink-0" aria-hidden />
              ) : theme === "dark" ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
