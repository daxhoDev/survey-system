import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import InvitationsPage from "@/pages/InvitationsPage";
import type { Invitation } from "@/lib/api/sondixAPI.schemas";
import { mockFetch, renderWithProviders } from "./helpers";

const list = "GET /api/v1/invitations";
const create = "POST /api/v1/invitations";

function invitation(overrides: Partial<Invitation>): Invitation {
  return {
    id: "0192a0a0-0000-7000-8000-000000000001",
    email: "pending@example.com",
    status: "pending",
    invitedBy: { id: "u1", username: "owner" },
    createdAt: "2026-09-26T10:00:00.000Z",
    expiresAt: "2026-09-28T10:00:00.000Z",
    acceptedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

const invitations = [
  invitation({}),
  invitation({ id: "0192a0a0-0000-7000-8000-000000000002", email: "accepted@example.com", status: "accepted" }),
  invitation({ id: "0192a0a0-0000-7000-8000-000000000003", email: "revoked@example.com", status: "revoked", invitedBy: null }),
  invitation({ id: "0192a0a0-0000-7000-8000-000000000004", email: "expired@example.com", status: "expired" }),
];
const listReply = { status: 200, body: { data: invitations, meta: { results: 4 } } };

describe("InvitationsPage (FE-27)", () => {
  it("lists every invitation with its status and revokes only pending ones", async () => {
    mockFetch({ [list]: listReply });
    renderWithProviders(<InvitationsPage />);

    const pendingRow = (await screen.findByText("pending@example.com")).closest("tr")!;
    expect(within(pendingRow).getByText("Pendiente")).toBeInTheDocument();
    expect(within(pendingRow).getByText("owner")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Revocar" })).toHaveLength(1);

    const revokedRow = screen.getByText("revoked@example.com").closest("tr")!;
    expect(within(revokedRow).getByText("Revocada")).toBeInTheDocument();
    expect(within(revokedRow).getByText("—")).toBeInTheDocument();
    for (const label of ["Aceptada", "Caducada"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("filters the table by status on the client", async () => {
    const fetchMock = mockFetch({ [list]: listReply });
    const user = userEvent.setup();
    renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");
    const filters = within(screen.getByRole("group", { name: "Filtrar por estado" }));

    await user.click(filters.getByRole("button", { name: "Aceptada" }));
    expect(screen.getByText("accepted@example.com")).toBeInTheDocument();
    expect(screen.queryByText("pending@example.com")).not.toBeInTheDocument();
    expect(filters.getByRole("button", { name: "Aceptada" })).toHaveAttribute("aria-pressed", "true");

    await user.click(filters.getByRole("button", { name: "Todas" }));
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates an invitation and keeps its link visible to copy", async () => {
    const fetchMock = mockFetch({
      [list]: listReply,
      [create]: {
        status: 201,
        body: { data: { invitation: invitation({ email: "new@example.com" }), token: "raw-token" } },
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");

    await user.type(screen.getByPlaceholderText("persona@ejemplo.com"), "new@example.com");
    await user.click(screen.getByRole("button", { name: "Invitar" }));

    const link = `${window.location.origin}/auth/invite/raw-token`;
    expect(await screen.findByLabelText("Enlace de invitación")).toHaveValue(link);
    expect(screen.getByText(/solo se muestra ahora y caduca en 48 horas/)).toBeInTheDocument();
    const createCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(createCall[1]!.body))).toEqual({ email: "new@example.com" });

    await user.click(screen.getByTitle("Copiar enlace"));
    await expect(navigator.clipboard.readText()).resolves.toBe(link);
    expect(screen.getByLabelText("Enlace de invitación")).toHaveValue(link);
  });

  it("validates the email before calling the API and shows a 409 in a toast", async () => {
    const fetchMock = mockFetch({
      [list]: listReply,
      [create]: {
        status: 409,
        body: { status: 409, title: "Conflict", detail: "There is already an user with this email" },
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");
    const input = screen.getByPlaceholderText("persona@ejemplo.com");

    await user.type(input, "owner@example");
    await user.click(screen.getByRole("button", { name: "Invitar" }));
    expect(await screen.findByText("Must be a valid email")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.type(input, ".com");
    await user.click(screen.getByRole("button", { name: "Invitar" }));
    expect(
      await screen.findByText("There is already an user with this email"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Enlace de invitación")).not.toBeInTheDocument();
  });

  it("revokes after confirming in the dialog (FE-25)", async () => {
    const revokePath = `DELETE /api/v1/invitations/${invitations[0]!.id}`;
    const fetchMock = mockFetch({ [list]: listReply, [revokePath]: { status: 204 } });
    const user = userEvent.setup();
    renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");

    await user.click(screen.getByRole("button", { name: "Revocar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/pending@example.com/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Revocar" }));

    expect(await screen.findByText("Invitación revocada")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([, init]) => (init?.method ?? "GET") === "GET"),
      ).toHaveLength(2),
    );
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true);
  });
});
