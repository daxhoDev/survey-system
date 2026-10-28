import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";
import { LoginForm } from "@/components/login-form";
import { getGetCurrentUserQueryKey } from "@/lib/api/users/users";
import { mockFetch, renderWithProviders } from "./helpers";

const login = "POST /api/v1/users/login";
const owner = { id: "1", username: "owner", email: "owner@example.com" };

// Labels carry an aria-hidden required mark, so they are matched by prefix.
const emailField = () => screen.getByLabelText(/^Correo electrónico/);
const passwordField = () => screen.getByLabelText(/^Contraseña/);

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(emailField(), email);
  await user.type(passwordField(), password);
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
}

describe("LoginForm (REQ-FE-015, REQ-BRAND-019)", () => {
  it("AC-FE-015-1: shows the title, description, fields with placeholders and button", () => {
    mockFetch({});
    renderWithProviders(<LoginForm />);

    const title = screen.getByRole("heading", { level: 1, name: "Inicia sesión" });
    expect(title).toHaveClass("text-h2");
    expect(screen.getByText("Accede al sistema de gestión de encuestas")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Correo electrónico" })).toHaveAttribute(
      "placeholder",
      "correo@ejemplo.com",
    );
    expect(passwordField()).toHaveAttribute("placeholder", "Introduce tu contraseña");
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("AC-FE-015-2: toggles the password visibility with the eye button", async () => {
    mockFetch({});
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();
    const input = passwordField();

    expect(input).toHaveAttribute("type", "password");
    const show = screen.getByRole("button", { name: "Mostrar contraseña" });
    expect(show).toHaveAttribute("aria-pressed", "false");
    await user.click(show);
    expect(input).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Ocultar contraseña" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    await user.click(hide);
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("AC-FE-015-3: stores the user in the getCurrentUser cache and navigates to /dashboard", async () => {
    const fetchMock = mockFetch({ [login]: { status: 200, body: { data: owner } } });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth/login"]}>
          <Routes>
            <Route path="/auth/login" element={<LoginForm />} />
            <Route path="/dashboard" element={<p>dashboard</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await fillAndSubmit("owner@example.com", "password123");

    await waitFor(() => expect(screen.getByText("dashboard")).toBeInTheDocument());
    expect(queryClient.getQueryData(getGetCurrentUserQueryKey())).toEqual({ data: owner });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({
      email: "owner@example.com",
      password: "password123",
    });
  });

  it("AC-FE-015-4 / AC-BRAND-019-2: shows the API error detail in a toast and keeps the values", async () => {
    mockFetch({
      [login]: {
        status: 401,
        body: { status: 401, title: "Invalid credentials", detail: "Invalid email or password" },
      },
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
        <Toaster />
      </QueryClientProvider>,
    );

    await fillAndSubmit("owner@example.com", "wrong-password");

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(emailField()).toHaveValue("owner@example.com");
    expect(passwordField()).toHaveValue("wrong-password");
  });

  it("AC-BRAND-019-2: client errors are under the field, wired with aria-invalid and aria-describedby, and no request is sent", async () => {
    const fetchMock = mockFetch({});
    renderWithProviders(<LoginForm />);

    // "owner@example" passes the native type="email" check but not Zod.
    await fillAndSubmit("owner@example", "123");

    const emailError = await screen.findByText("Introduce un correo electrónico válido");
    const passwordError = screen.getByText("La contraseña debe tener al menos 5 caracteres");
    expect(fetchMock).not.toHaveBeenCalled();

    for (const [field, error] of [
      [emailField(), emailError],
      [passwordField(), passwordError],
    ] as const) {
      expect(field).toHaveAttribute("aria-invalid", "true");
      const errorEl = error.closest("[id]")!;
      expect(field).toHaveAttribute("aria-describedby", errorEl.id);
      expect(errorEl).toHaveClass("text-rust");
      expect(errorEl.querySelector("svg")).not.toBeNull();
    }
    expect(emailField()).toHaveValue("owner@example");
    expect(passwordField()).toHaveValue("123");
  });

  it("AC-BRAND-019-1: every field has a visible associated label with a required mark", () => {
    mockFetch({});
    const { container } = renderWithProviders(<LoginForm />);

    for (const id of ["email", "password"]) {
      const label = container.querySelector(`label[for="${id}"]`)!;
      expect(label, id).not.toBeNull();
      expect(label.querySelector('[aria-hidden="true"]')?.textContent).toBe("*");
      expect(container.querySelector(`#${id}`)).toHaveAttribute("aria-required", "true");
    }
  });

  it("AC-BRAND-019-3: fields and the button are reached with the keyboard and the form submits with Enter", async () => {
    mockFetch({});
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();

    await user.tab();
    expect(emailField()).toHaveFocus();
    await user.tab();
    expect(passwordField()).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Introduce un correo electrónico válido")).toBeInTheDocument();
  });
});
