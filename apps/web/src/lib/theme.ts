import { useSyncExternalStore } from "react";

// Theme preference (BRAND-11). `index.html` applies it before the first paint
// with the same storage key and rules; this module keeps it in sync at runtime.
export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sondix-theme";

const listeners = new Set<() => void>();
const darkQuery =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage unavailable: fall back to the system preference.
  }
  return "system";
}

let current: Theme = readTheme();

function applyTheme() {
  const dark =
    current === "dark" || (current === "system" && !!darkQuery?.matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function getTheme(): Theme {
  return current;
}

export function setTheme(theme: Theme) {
  current = theme;
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The choice still applies to this page view.
  }
  applyTheme();
  listeners.forEach((listener) => listener());
}

/** Applies the stored theme and follows system changes while on "system". */
export function initTheme() {
  applyTheme();
  darkQuery?.addEventListener("change", () => {
    if (current === "system") applyTheme();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getTheme, getTheme);
  return [theme, setTheme];
}
