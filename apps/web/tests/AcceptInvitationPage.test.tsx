import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import AcceptInvitationPage from "@/pages/AcceptInvitationPage";
import { getGetCurrentUserQueryKey } from "@/lib/api/users/users";
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
  await user.type(await screen.findByLabelText(/^Nombre de usuario/), values.username);
  await user.type(screen.getByLabelText(/^Contraseña/), values.password);
  await user.type(screen.getByLabelText(/^Confirmar contraseña/), values.passwordConfirm);
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

describe("AcceptInvitationPage (REQ-FE-028, REQ-BRAND-019)", () => {
  it("AC-FE-028-1: shows the invalid view for an unknown, expired or used token", async () => {
    mockFetch({
      ...noSession,
      [tokenInfo]: {
        status: 404,
        body: { status: 404, title: "Not found", detail: "This invitation is invalid or has expired" },
      },
    });
    renderWithProviders(<AcceptInvitationPage />, { path, route });

    expect(await screen.findByText("Invitación no válida o caducada")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Nombre de usuario/)).not.toBeInTheDocument();
  });

  it("AC-FE-028-4 / AC-FE-028-5: shows the invited email read only and validates with the Spanish form schema", async () => {
    const fetchMock = mockFetch({ ...noSession, [tokenInfo]: validToken });
    renderWithProviders(<AcceptInvitationPage />, { path, route });

    expect(await screen.findByLabelText("Correo electrónico")).toHaveValue("new@example.com");
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("readonly");

    await fill({ username: "ab", password: "password123", passwordConfirm: "different" });

    expect(await screen.findByText("El nombre de usuario debe tener al menos 3 caracteres")).toBeInTheDocument();
    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/accept"))).toBe(false);
  });

  it("AC-FE-028-6: creates the account and goes to /dashboard", async () => {
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

  it("AC-FE-028-7 / AC-BRAND-019-2: shows the API detail in a toast when the account cannot be created", async () => {
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

  it("AC-FE-028-2 / AC-FE-028-3: with a session open, asks to log out first and then shows the form", async () => {
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
    expect(screen.queryByLabelText(/^Nombre de usuario/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByLabelText(/^Nombre de usuario/)).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("new@example.com");
  });

  it("AC-FE-028-4: each password field has its own visibility toggle", async () => {
    mockFetch({ ...noSession, [tokenInfo]: validToken });
    renderWithProviders(<AcceptInvitationPage />, { path, route });
    const user = userEvent.setup();

    const password = await screen.findByLabelText(/^Contraseña/);
    const confirm = screen.getByLabelText(/^Confirmar contraseña/);
    const [showPassword] = screen.getAllByRole("button", { name: "Mostrar contraseña" });
    await user.click(showPassword!);

    expect(password).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "password");
  });

  it("AC-FE-028-6: stores { data: user } in the getCurrentUser cache and navigates to /dashboard", async () => {
    const user = { id: "1", username: "newuser", email: "new@example.com", createdAt: "2026-09-26T10:00:00.000Z", deletedAt: null };
    mockFetch({ ...noSession, [tokenInfo]: validToken, [accept]: { status: 201, body: { data: user } } });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={<AcceptInvitationPage />} />
            <Route path="/dashboard" element={<p>dashboard</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await fill(account);

    await waitFor(() => expect(screen.getByText("dashboard")).toBeInTheDocument());
    expect(queryClient.getQueryData(getGetCurrentUserQueryKey())).toEqual({ data: user });
  });

  it("AC-FE-028-5 / AC-BRAND-019-2: client errors are wired with aria-invalid and aria-describedby and the values are kept", async () => {
    mockFetch({ ...noSession, [tokenInfo]: validToken });
    renderWithProviders(<AcceptInvitationPage />, { path, route });

    await fill({ username: "ab", password: "password123", passwordConfirm: "different" });

    const usernameError = await screen.findByText("El nombre de usuario debe tener al menos 3 caracteres");
    const confirmError = screen.getByText("Las contraseñas no coinciden");
    const username = screen.getByLabelText(/^Nombre de usuario/);
    const confirm = screen.getByLabelText(/^Confirmar contraseña/);
    for (const [field, error] of [
      [username, usernameError],
      [confirm, confirmError],
    ] as const) {
      expect(field).toHaveAttribute("aria-invalid", "true");
      const errorEl = error.closest("[id]")!;
      expect(field).toHaveAttribute("aria-describedby", errorEl.id);
      expect(errorEl).toHaveClass("text-rust");
      expect(errorEl.querySelector("svg")).not.toBeNull();
    }
    expect(screen.getByLabelText(/^Contraseña/)).not.toHaveAttribute("aria-invalid");
    expect(username).toHaveValue("ab");
    expect(confirm).toHaveValue("different");
  });

  it("AC-BRAND-019-1: the editable fields have visible labels with a required mark; the page uses no card", async () => {
    mockFetch({ ...noSession, [tokenInfo]: validToken });
    const { container } = renderWithProviders(<AcceptInvitationPage />, { path, route });
    await screen.findByLabelText(/^Nombre de usuario/);

    for (const id of ["username", "password", "passwordConfirm"]) {
      const label = container.querySelector(`label[for="${id}"]`)!;
      expect(label.querySelector('[aria-hidden="true"]')?.textContent, id).toBe("*");
      expect(container.querySelector(`#${id}`)).toHaveAttribute("aria-required", "true");
    }
    expect(screen.getByRole("heading", { level: 1, name: "Crea tu cuenta" })).toHaveClass("text-h2");
    expect(container.querySelector('[data-slot^="card"]')).toBeNull();
  });

  it("AC-FE-028-7 / AC-BRAND-019-2: keeps the entered values after an API error", async () => {
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

    expect(await screen.findByText("There is already an user with this username")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nombre de usuario/)).toHaveValue("newuser");
    expect(screen.getByLabelText(/^Contraseña/)).toHaveValue("password123");
  });
});
