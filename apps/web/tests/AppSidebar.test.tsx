import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "./helpers";

function renderSidebar(route: string) {
  return renderWithProviders(
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </TooltipProvider>,
    { path: "/dashboard/*", route },
  );
}

describe("AppSidebar (FE-31)", () => {
  it("lists only the existing sections, Invitaciones under Administración", () => {
    renderSidebar("/dashboard");

    expect(screen.getByRole("link", { name: "Encuestas" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Invitaciones" })).toHaveAttribute(
      "href",
      "/dashboard/invitations",
    );
    expect(screen.getByText("Administración")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sondix, ir a encuestas" })).toBeInTheDocument();
  });

  it("marks the current section, survey pages included", () => {
    renderSidebar("/dashboard/surveys/some-survey");

    expect(screen.getByRole("link", { name: "Encuestas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Invitaciones" })).not.toHaveAttribute("aria-current");
  });

  it("collapses to icons and remembers it in the sidebar_state cookie", async () => {
    const { container } = renderSidebar("/dashboard/invitations");
    const user = userEvent.setup();

    expect(screen.getByRole("link", { name: "Invitaciones" })).toHaveAttribute("aria-current", "page");
    const rail = within(container).getByRole("button", { name: "Mostrar u ocultar menú" });
    await user.click(rail);

    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
  });
});
