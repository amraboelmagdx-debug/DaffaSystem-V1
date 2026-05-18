"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from "lucide-react";
import { CanonicalSidebarNav } from "@/components/layout/canonical-sidebar-nav";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUiStore } from "@/stores/use-ui-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { CommandMenu } from "@/components/command-menu";
import { PersistenceStatusBanner } from "@/components/dev/persistence-status-banner";
import { BusinessUnitSwitcher } from "@/components/layout/business-unit-switcher";

export function AppShell({ children }: { children: React.ReactNode }) {
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
          <CanonicalSidebarNav collapsed={sidebarCollapsed} />
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
        <PersistenceStatusBanner />
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-sm font-semibold">{ts("brand")}</span>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <BusinessUnitSwitcher />
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
