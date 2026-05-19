"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

export type ThemeSetting = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeSetting;
  setTheme: (value: ThemeSetting | ((prev: ThemeSetting) => ThemeSetting)) => void;
  resolvedTheme: ResolvedTheme | undefined;
  forcedTheme?: ResolvedTheme;
  systemTheme?: ResolvedTheme;
  themes: ThemeSetting[];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveTheme(theme: ThemeSetting): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(resolved: ResolvedTheme, attribute: "class" | "data-theme") {
  const root = document.documentElement;
  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  } else {
    root.setAttribute(attribute, resolved);
  }
  root.style.colorScheme = resolved;
}

function readStoredTheme(defaultTheme: ThemeSetting): ThemeSetting {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* private mode */
  }
  return defaultTheme;
}

export type AppThemeProviderProps = {
  children: ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: ThemeSetting;
  enableSystem?: boolean;
  forcedTheme?: ResolvedTheme;
};

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "dark",
  enableSystem = true,
  forcedTheme,
}: AppThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeSetting>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme | undefined>(
    undefined
  );
  const [mounted, setMounted] = useState(false);

  const apply = useCallback(
    (setting: ThemeSetting) => {
      const resolved = forcedTheme ?? resolveTheme(setting);
      setResolvedTheme(resolved);
      applyTheme(resolved, attribute);
    },
    [attribute, forcedTheme]
  );

  useEffect(() => {
    const initial = readStoredTheme(defaultTheme);
    setThemeState(initial);
    apply(initial);
    setMounted(true);
  }, [apply, defaultTheme]);

  useEffect(() => {
    if (!mounted || forcedTheme) return;
    apply(theme);
  }, [theme, mounted, apply, forcedTheme]);

  useEffect(() => {
    if (!enableSystem || theme !== "system" || forcedTheme) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, enableSystem, apply, forcedTheme]);

  const setTheme = useCallback(
    (value: ThemeSetting | ((prev: ThemeSetting) => ThemeSetting)) => {
      setThemeState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const themes = useMemo<ThemeSetting[]>(
    () => (enableSystem ? ["light", "dark", "system"] : ["light", "dark"]),
    [enableSystem]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      forcedTheme,
      systemTheme:
        enableSystem && mounted
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : undefined,
      themes,
    }),
    [theme, setTheme, resolvedTheme, forcedTheme, enableSystem, mounted, themes]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Drop-in replacement for `useTheme` from next-themes (subset used in this app). */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark",
      setTheme: () => {},
      resolvedTheme: "dark",
      themes: ["light", "dark", "system"],
    };
  }
  return ctx;
}
