import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardHeader from "@/components/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { mockFetch, renderWithProviders } from "./helpers";

const me = {
  "GET /api/v1/users/me": {
    status: 200,
    body: { data: { id: "u1", username: "owner", email: "owner@example.com" } },
  },
};

function renderHeader() {
  return renderWithProviders(
    <SidebarProvider>
      <DashboardHeader />
    </SidebarProvider>,
    { path: "/dashboard", route: "/dashboard" },
  );
}

describe("DashboardHeader (FE-16)", () => {
  it("shows the sidebar toggle, the user and logout; sections live in the sidebar", async () => {
    mockFetch(me);
    renderHeader();

    expect(await screen.findByText("owner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar u ocultar menú" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Invitaciones" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("keeps a logo link to the dashboard for mobile", async () => {
    mockFetch(me);
    renderHeader();

    await screen.findByText("owner");
    expect(screen.getByRole("link", { name: "Sondix, ir a encuestas" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
