"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { advancedNav, commandNav, navGroups } from "@/config/canonical-navigation";
import { useUiStore } from "@/stores/use-ui-store";

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

  const navigate = (href: string) => {
    router.push(href);
    setCommandOpen(false);
  };

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
            {navGroups.map((group) => (
              <CommandGroup key={group.groupKey} heading={t(group.labelKey as never)}>
                {group.items.map((l) => {
                  const Icon = l.icon;
                  return (
                    <CommandItem key={l.href} onSelect={() => navigate(l.href)}>
                      <Icon className="me-2 h-4 w-4 opacity-70" />
                      {t(l.key)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            <CommandGroup heading={t("advancedGroup")}>
              {advancedNav.map((l) => {
                const Icon = l.icon;
                return (
                  <CommandItem key={l.href} onSelect={() => navigate(l.href)}>
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
