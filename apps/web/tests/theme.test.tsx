import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("theme (BRAND-11)", () => {
  it("defaults to Sistema and follows system changes", async () => {
    const { initTheme, getTheme, changeSystem } = await loadTheme(true);
    initTheme();

    expect(getTheme()).toBe("system");
    expect(isDark()).toBe(true);
    changeSystem(false);
    expect(isDark()).toBe(false);
  });

  it("stores an explicit choice and ignores the system while it is set", async () => {
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

  it("applies the stored choice on load", async () => {
    const { initTheme, getTheme } = await loadTheme(true, "light");
    initTheme();

    expect(getTheme()).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("the header selector offers Claro, Oscuro and Sistema", async () => {
    await loadTheme(false);
    const { default: DashboardHeader } = await import(
      "@/components/DashboardHeader"
    );
    mockFetch({
      "GET /api/v1/users/me": {
        status: 200,
        body: { data: { id: "u1", username: "owner", email: "owner@example.com" } },
      },
    });
    renderWithProviders(<DashboardHeader />, { path: "/dashboard", route: "/dashboard" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tema: Sistema" }));
    expect(screen.getByRole("menuitemradio", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Sistema" })).toBeChecked();
    await user.click(screen.getByRole("menuitemradio", { name: "Oscuro" }));

    expect(isDark()).toBe(true);
    expect(screen.getByRole("button", { name: "Tema: Oscuro" })).toBeInTheDocument();
  });
});
