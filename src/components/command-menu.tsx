"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  BarChart3,
  Building2,
  Grid3x3,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Settings2,
  Target,
  Users2,
  Workflow,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/stores/use-ui-store";

const links = [
  { href: "/", key: "executive" as const, icon: LayoutDashboard },
  { href: "/companies", key: "companies" as const, icon: Building2 },
  { href: "/forecasts", key: "forecasts" as const, icon: LineChart },
  { href: "/scenarios", key: "scenarios" as const, icon: BarChart3 },
  { href: "/pipeline", key: "pipeline" as const, icon: Workflow },
  { href: "/sales-plan", key: "salesPlan" as const, icon: Target },
  { href: "/hr-workforce", key: "hrWorkforce" as const, icon: Users2 },
  { href: "/grid", key: "grid" as const, icon: Grid3x3 },
  { href: "/assistant", key: "assistant" as const, icon: MessageSquare },
  { href: "/settings", key: "settings" as const, icon: Settings2 },
];

export function CommandMenu() {
  const t = useTranslations("nav");
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUiStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const { commandOpen: open, setCommandOpen: set } = useUiStore.getState();
        set(!open);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <Command className="rounded-lg border-none shadow-none">
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Navigate">
              {links.map((l) => {
                const Icon = l.icon;
                return (
                  <CommandItem
                    key={l.href}
                    onSelect={() => {
                      router.push(l.href);
                      setCommandOpen(false);
                    }}
                  >
                    <Icon className="me-2 h-4 w-4 opacity-70" />
                    {t(l.key)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
