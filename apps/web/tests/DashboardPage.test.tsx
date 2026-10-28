import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import DashboardPage from "@/pages/DashboardPage";
import { mockFetch } from "./helpers";

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />}>
            <Route path="" element={<p>child route</p>} />
          </Route>
          <Route path="/auth/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage (REQ-FE-013)", () => {
  it("AC-FE-013-1: shows Cargando panel... while GET /users/me is pending", async () => {
    mockFetch({ "GET /api/v1/users/me": () => new Promise(() => {}) as never });
    renderDashboard();

    const line = await screen.findByText("Cargando panel...");
    expect(line).toHaveClass("text-ink-muted");
    expect(screen.queryByText("Loading dashboard...")).not.toBeInTheDocument();
  });

  it("AC-FE-013-2: navigates to /auth/login when GET /users/me fails", async () => {
    mockFetch({ "GET /api/v1/users/me": { status: 401, body: { detail: "No autenticado" } } });
    renderDashboard();

    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("AC-FE-013-3: renders TopBar and the child route in a centered <main>, at most 80 rem wide, with the gutters", async () => {
    mockFetch({
      "GET /api/v1/users/me": {
        status: 200,
        body: { data: { id: "u1", username: "owner", email: "owner@example.com" } },
      },
    });
    renderDashboard();

    const child = await screen.findByText("child route");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main).toContainElement(child);
    // REQ-BRAND-015 gutters: 16 px, 24 px from md, 44 px from lg.
    expect(main).toHaveClass("px-4", "md:px-6", "lg:px-11");
    expect(child.parentElement).toHaveClass("mx-auto", "max-w-7xl");
    expect(screen.queryByText(/sidebar/i)).not.toBeInTheDocument();
    expect(document.cookie).not.toContain("sidebar_state");
  });
});
