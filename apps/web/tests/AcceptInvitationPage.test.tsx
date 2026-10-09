import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AcceptInvitationPage from "@/pages/AcceptInvitationPage";
import { mockFetch, renderWithProviders } from "./helpers";

const path = "/auth/invite/:token";
const route = "/auth/invite/raw-token";
const tokenInfo = "GET /api/v1/invitations/token/raw-token";
const accept = "POST /api/v1/invitations/token/raw-token/accept";
const me = "GET /api/v1/users/me";
const refresh = "POST /api/v1/users/refresh";
const logout = "POST /api/v1/users/logout";

const unauthenticated = {
  status: 401,
  body: { status: 401, title: "Unauthenticated user", detail: "Please, log in first" },
};
const noSession = { [me]: unauthenticated, [refresh]: unauthenticated };
const validToken = {
  status: 200,
  body: { data: { email: "new@example.com", expiresAt: "2026-09-28T10:00:00.000Z" } },
};
const account = { username: "newuser", password: "password123", passwordConfirm: "password123" };

async function fill(values: typeof account) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Nombre de usuario"), values.username);
  await user.type(screen.getByLabelText("Contraseña"), values.password);
  await user.type(screen.getByLabelText("Confirmar contraseña"), values.passwordConfirm);
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

describe("AcceptInvitationPage (FE-28)", () => {
  it("shows the invalid view for an unknown, expired or used token", async () => {
    mockFetch({
      ...noSession,
      [tokenInfo]: {
        status: 404,
        body: { status: 404, title: "Not found", detail: "This invitation is invalid or has expired" },
      },
    });
    renderWithProviders(<AcceptInvitationPage />, { path, route });

    expect(await screen.findByText("Invitación no válida o caducada")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre de usuario")).not.toBeInTheDocument();
  });

  it("shows the invited email read only and validates with the Spanish form schema", async () => {
    const fetchMock = mockFetch({ ...noSession, [tokenInfo]: validToken });
    renderWithProviders(<AcceptInvitationPage />, { path, route });

    expect(await screen.findByLabelText("Email")).toHaveValue("new@example.com");
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");

    await fill({ username: "ab", password: "password123", passwordConfirm: "different" });

    expect(await screen.findByText("El nombre de usuario debe tener al menos 3 caracteres")).toBeInTheDocument();
    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/accept"))).toBe(false);
  });

  it("creates the account, stores the session and goes to /dashboard", async () => {
    const fetchMock = mockFetch({
      ...noSession,
      [tokenInfo]: validToken,
      [accept]: {
        status: 201,
        body: { data: { id: "1", username: "newuser", email: "new@example.com", createdAt: "2026-09-26T10:00:00.000Z", deletedAt: null } },
      },
    });
    renderWithProviders(<AcceptInvitationPage />, { path, route });

    await fill(account);

    await waitFor(() => expect(screen.getByText("other page")).toBeInTheDocument());
    const acceptCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/accept"))!;
    expect(JSON.parse(String(acceptCall[1]!.body))).toEqual(account);
  });

  it("shows the API detail in a toast when the account cannot be created", async () => {
    mockFetch({
      ...noSession,
      [tokenInfo]: validToken,
      [accept]: {
        status: 409,
        body: { status: 409, title: "Conflict", detail: "There is already an user with this username" },
      },
    });
    renderWithProviders(<AcceptInvitationPage />, { path, route });

    await fill(account);

    expect(
      await screen.findByText("There is already an user with this username"),
    ).toBeInTheDocument();
  });

  it("with a session open, asks to log out first and then shows the form", async () => {
    let loggedIn = true;
    mockFetch({
      [tokenInfo]: validToken,
      [me]: () =>
        loggedIn
          ? { status: 200, body: { data: { id: "u1", username: "owner", email: "owner@example.com" } } }
          : unauthenticated,
      [refresh]: unauthenticated,
      [logout]: () => {
        loggedIn = false;
        return { status: 204 };
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<AcceptInvitationPage />, { path, route });

    expect(await screen.findByText("Ya tienes una sesión iniciada")).toBeInTheDocument();
    expect(screen.getByText(/conectado como owner/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre de usuario")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByLabelText("Nombre de usuario")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("new@example.com");
  });
});
