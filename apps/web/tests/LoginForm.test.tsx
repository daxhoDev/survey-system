import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LoginForm } from "@/components/login-form";
import { mockFetch, renderWithProviders } from "./helpers";

const login = "POST /api/v1/users/login";

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Login" }));
}

describe("LoginForm (FE-15)", () => {
  it("validates with loginDataSchema before calling the API", async () => {
    const fetchMock = mockFetch({});
    renderWithProviders(<LoginForm />);

    // "owner@example" passes the native type="email" check but not Zod.
    await fillAndSubmit("owner@example", "123");

    expect(await screen.findByText("Must be a valid email")).toBeInTheDocument();
    expect(screen.getByText("Must have at least 5 characters")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the API error detail in a toast", async () => {
    mockFetch({
      [login]: {
        status: 401,
        body: { status: 401, title: "Invalid credentials", detail: "Invalid email or password" },
      },
    });
    renderWithProviders(<LoginForm />);

    await fillAndSubmit("owner@example.com", "wrong-password");

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });

  it("navigates to /dashboard after a successful login", async () => {
    const fetchMock = mockFetch({
      [login]: {
        status: 200,
        body: { data: { id: "1", username: "owner", email: "owner@example.com" } },
      },
    });
    renderWithProviders(<LoginForm />, { path: "/auth/login", route: "/auth/login" });

    await fillAndSubmit("owner@example.com", "password123");

    await waitFor(() => expect(screen.getByText("other page")).toBeInTheDocument());
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({
      email: "owner@example.com",
      password: "password123",
    });
  });
});
