import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import DashboardHeader from "@/components/DashboardHeader";
import { mockFetch, renderWithProviders } from "./helpers";

describe("DashboardHeader (FE-16)", () => {
  it("links to the invitations page", async () => {
    mockFetch({
      "GET /api/v1/users/me": {
        status: 200,
        body: { data: { id: "u1", username: "owner", email: "owner@example.com" } },
      },
    });
    renderWithProviders(<DashboardHeader />, { path: "/dashboard", route: "/dashboard" });

    await screen.findByText("owner");
    const link = screen.getByRole("link", { name: "Invitaciones" });
    expect(link).toHaveAttribute("href", "/dashboard/invitations");

    await userEvent.setup().click(link);
    expect(await screen.findByText("other page")).toBeInTheDocument();
  });
});
