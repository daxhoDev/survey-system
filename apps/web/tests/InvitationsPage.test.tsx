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

describe("InvitationsPage (REQ-FE-027, REQ-BRAND-019, REQ-BRAND-030)", () => {
  it("AC-FE-027-3: lists every invitation with its status and revokes only pending ones", async () => {
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

  it("AC-FE-027-5: filters the table by status on the client", async () => {
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

  it("AC-FE-027-1: creates an invitation and keeps its link visible to copy", async () => {
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

    await user.click(screen.getByRole("button", { name: "Copiar enlace" }));
    await expect(navigator.clipboard.readText()).resolves.toBe(link);
    expect(screen.getByLabelText("Enlace de invitación")).toHaveValue(link);
  });

  it("AC-FE-027-2 / AC-BRAND-019-2: validates the email before calling the API and shows a 409 in a toast", async () => {
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
    expect(await screen.findByText("Introduce un correo electrónico válido")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.type(input, ".com");
    await user.click(screen.getByRole("button", { name: "Invitar" }));
    expect(
      await screen.findByText("There is already an user with this email"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Enlace de invitación")).not.toBeInTheDocument();
  });

  it("AC-FE-027-4: revokes after confirming in the dialog (REQ-FE-025)", async () => {
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

  it("AC-FE-027-6: a second created invitation replaces the shown link, and leaving the page drops it", async () => {
    let n = 0;
    mockFetch({
      [list]: listReply,
      [create]: () => {
        n += 1;
        return {
          status: 201,
          body: { data: { invitation: invitation({ email: `new${n}@example.com` }), token: `token-${n}` } },
        };
      },
    });
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");
    const input = screen.getByPlaceholderText("persona@ejemplo.com");

    await user.type(input, "new1@example.com");
    await user.click(screen.getByRole("button", { name: "Invitar" }));
    expect(await screen.findByLabelText("Enlace de invitación")).toHaveValue(
      `${window.location.origin}/auth/invite/token-1`,
    );
    // The form is cleared for the next invitation.
    expect(input).toHaveValue("");

    await user.type(input, "new2@example.com");
    await user.click(screen.getByRole("button", { name: "Invitar" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Enlace de invitación")).toHaveValue(
        `${window.location.origin}/auth/invite/token-2`,
      ),
    );
    expect(screen.getAllByLabelText("Enlace de invitación")).toHaveLength(1);

    unmount();
    mockFetch({ [list]: listReply });
    renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");
    expect(screen.queryByLabelText("Enlace de invitación")).not.toBeInTheDocument();
  });

  it("REQ-FE-027 layout: h1 title, one-line form, ruled link block, chips, table, ghost rust Revocar, no card", async () => {
    mockFetch({
      [list]: listReply,
      [create]: {
        status: 201,
        body: { data: { invitation: invitation({ email: "new@example.com" }), token: "raw-token" } },
      },
    });
    const user = userEvent.setup();
    const { container } = renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");

    expect(screen.getByRole("heading", { level: 1, name: "Invitaciones" })).toHaveClass("text-h1");
    expect(container.querySelector('[data-slot^="card"]')).toBeNull();

    const input = screen.getByPlaceholderText("persona@ejemplo.com");
    const submit = screen.getByRole("button", { name: "Invitar" });
    const row = input.parentElement!;
    expect(row).toContainElement(submit);
    expect(row).toHaveClass("flex-col", "md:flex-row");
    expect(input).toHaveClass("md:flex-1");

    await user.type(input, "new@example.com");
    await user.click(submit);
    const link = await screen.findByLabelText("Enlace de invitación");
    expect(link).toHaveAttribute("readonly");
    const block = link.closest(".border-y")!;
    expect(block).toHaveClass("border-rule-strong");
    expect(block).toContainElement(screen.getByRole("button", { name: "Copiar enlace" }));
    expect(block).toHaveTextContent(/solo se muestra ahora y caduca en 48 horas/);
    expect(screen.getByRole("button", { name: "Copiar enlace" })).toHaveTextContent("");

    // Order: form, link block, chips, table.
    const chips = screen.getByRole("group", { name: "Filtrar por estado" });
    const table = screen.getByRole("table");
    const follows = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(row, block)).toBe(true);
    expect(follows(block, chips)).toBe(true);
    expect(follows(chips, table)).toBe(true);

    expect(screen.getByRole("columnheader", { name: "Correo electrónico" })).toBeInTheDocument();
    const revoke = screen.getByRole("button", { name: "Revocar" });
    expect(revoke).toHaveAttribute("data-variant", "ghost");
    expect(revoke).toHaveClass("text-rust");
  });

  it("AC-BRAND-030-1: the chips are toggle buttons, Todas pressed by default", async () => {
    mockFetch({ [list]: listReply });
    renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");
    const filters = within(screen.getByRole("group", { name: "Filtrar por estado" }));

    const names = filters.getAllByRole("button").map((b) => b.textContent);
    expect(names).toEqual(["Todas", "Pendiente", "Aceptada", "Revocada", "Caducada"]);
    expect(filters.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
    expect(filters.getByRole("button", { name: "Pendiente" })).toHaveAttribute("aria-pressed", "false");
  });

  it("AC-BRAND-019-1 / AC-BRAND-019-2: the email has a labelled required field wired to its error", async () => {
    const fetchMock = mockFetch({ [list]: listReply });
    const user = userEvent.setup();
    const { container } = renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");

    const label = container.querySelector('label[for="invitation-email"]')!;
    expect(label.querySelector('[aria-hidden="true"]')?.textContent).toBe("*");
    const input = screen.getByRole("textbox", { name: "Correo electrónico" });
    expect(input).toHaveAttribute("aria-required", "true");

    await user.type(input, "owner@example");
    await user.click(screen.getByRole("button", { name: "Invitar" }));
    const error = (await screen.findByText("Introduce un correo electrónico válido")).closest("[id]")!;
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(error).toHaveClass("text-rust");
    expect(input).toHaveValue("owner@example");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when the filter matches nothing", async () => {
    mockFetch({ [list]: { status: 200, body: { data: [invitations[0]!], meta: { results: 1 } } } });
    const user = userEvent.setup();
    renderWithProviders(<InvitationsPage />);
    await screen.findByText("pending@example.com");

    await user.click(screen.getByRole("button", { name: "Caducada" }));
    expect(screen.getByText("Ninguna invitación tiene este estado.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
