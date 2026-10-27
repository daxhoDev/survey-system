import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch, renderWithProviders } from "./helpers";

// The theme module reads matchMedia and localStorage when it loads, so each
// test imports a fresh copy after preparing them.
async function loadTheme(systemDark: boolean, stored?: string) {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const query = {
    matches: systemDark,
    addEventListener: (_: string, l: (e: { matches: boolean }) => void) =>
      listeners.push(l),
    removeEventListener: () => {},
  };
  vi.stubGlobal("matchMedia", () => query);
  if (stored) localStorage.setItem("sondix-theme", stored);
  vi.resetModules();
  const mod = await import("@/lib/theme");
  const changeSystem = (dark: boolean) => {
    query.matches = dark;
    listeners.forEach((l) => l({ matches: dark }));
  };
  return { ...mod, changeSystem };
}

const isDark = () => document.documentElement.classList.contains("dark");

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("theme (REQ-BRAND-011)", () => {
  it("AC-BRAND-011-1: defaults to Sistema and follows system changes", async () => {
    const { initTheme, getTheme, changeSystem } = await loadTheme(true);
    initTheme();

    expect(getTheme()).toBe("system");
    expect(isDark()).toBe(true);
    changeSystem(false);
    expect(isDark()).toBe(false);
  });

  it("AC-BRAND-011-2 / AC-BRAND-011-3: stores an explicit choice and ignores the system while it is set", async () => {
    const { initTheme, setTheme, changeSystem } = await loadTheme(false);
    initTheme();

    setTheme("dark");
    expect(isDark()).toBe(true);
    expect(localStorage.getItem("sondix-theme")).toBe("dark");
    changeSystem(false);
    expect(isDark()).toBe(true);

    setTheme("system");
    expect(localStorage.getItem("sondix-theme")).toBeNull();
    expect(isDark()).toBe(false);
  });

  it("AC-BRAND-011-4 (runtime): applies the stored choice on load", async () => {
    const { initTheme, getTheme } = await loadTheme(true, "light");
    initTheme();

    expect(getTheme()).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("AC-BRAND-011-5: the login page applies the stored theme and shows no theme selector", async () => {
    const { initTheme } = await loadTheme(false, "dark");
    initTheme();
    const { default: LoginPage } = await import("@/pages/LoginPage");
    renderWithProviders(<LoginPage />);

    expect(isDark()).toBe(true);
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tema" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Tema" })).not.toBeInTheDocument();
  }, 15_000);

  it("AC-FE-002-2 / AC-BRAND-008-2: the app's Toaster follows the active theme", async () => {
    const { initTheme, setTheme } = await loadTheme(false);
    initTheme();
    const { default: App } = await import("@/App");
    const { toast } = await import("sonner");
    const { act, render } = await import("@testing-library/react");
    mockFetch({});
    render(<App />);

    act(() => setTheme("dark"));
    act(() => {
      toast("Aviso");
    });
    const toaster = await waitFor(() => {
      const el = document.querySelector("[data-sonner-toaster]");
      expect(el).not.toBeNull();
      return el!;
    });
    expect(toaster).toHaveAttribute("data-sonner-theme", "dark");
    expect(document.querySelector("[data-sonner-toaster]")).toHaveAttribute(
      "data-y-position",
      "top",
    );
    expect(document.querySelector("[data-sonner-toaster]")).toHaveAttribute(
      "data-x-position",
      "center",
    );
  }, 15_000);
});
