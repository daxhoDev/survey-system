import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import AuthPage from "@/pages/AuthPage";
import LoginPage from "@/pages/LoginPage";
import AcceptInvitationPage from "@/pages/AcceptInvitationPage";
import { mockFetch } from "./helpers";

const unauthenticated = {
  status: 401,
  body: { status: 401, title: "Unauthenticated user", detail: "Please, log in first" },
};

// Renders the auth routes as App.tsx nests them.
function renderAuth(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="invite/:token" element={<AcceptInvitationPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const cases = [
  {
    route: "/auth/login",
    title: "Inicia sesión",
    setup: () => mockFetch({}),
  },
  {
    route: "/auth/invite/raw-token",
    title: "Crea tu cuenta",
    setup: () =>
      mockFetch({
        "GET /api/v1/invitations/token/raw-token": {
          status: 200,
          body: { data: { email: "new@example.com", expiresAt: "2026-09-28T10:00:00.000Z" } },
        },
        "GET /api/v1/users/me": unauthenticated,
        "POST /api/v1/users/refresh": unauthenticated,
      }),
  },
];

describe("AuthPage frame (REQ-FE-030, REQ-FE-029, REQ-BRAND-021, REQ-BRAND-023)", () => {
  for (const { route, title, setup } of cases) {
    it(`AC-FE-030-1: ${route} renders in one centered column of at most 24 rem with logo, line, 2 px strong rule and the page's form`, async () => {
      setup();
      const { container } = renderAuth(route);

      const heading = await screen.findByRole("heading", { level: 1, name: title });
      expect(heading).toHaveClass("text-h2");

      const column = screen.getByRole("main");
      expect(column).toHaveClass("max-w-96", "w-full", "flex-col");
      expect(column.parentElement).toHaveClass("justify-center", "bg-paper", "md:items-center");

      const children = Array.from(column.children);
      const logo = children[0]!;
      const line = children[1]!;
      const rule = children[2]!;
      expect(logo).toHaveAttribute("data-slot", "logo");
      expect(line).toHaveTextContent("Sistema de gestión de encuestas");
      expect(line).toHaveClass("text-small", "text-ink-muted");
      expect(rule.tagName).toBe("HR");
      expect(rule).toHaveClass("border-t-2", "border-rule-strong");
      // The page's title and form follow the rule.
      expect(rule.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(column.querySelector("form")).not.toBeNull();
      expect(column.querySelector('button[type="submit"]')).toHaveClass("w-full");

      // No side panel, card or texture (REQ-BRAND-023).
      expect(container.querySelector("aside")).toBeNull();
      expect(container.querySelector('[data-slot^="card"]')).toBeNull();
      expect(container.querySelector('[class*="gradient"], [class*="bg-["], [class*="noise"]')).toBeNull();
    });

    it(`AC-FE-029-2 / AC-BRAND-021-1: ${route} shows the Logo component once and no other Sondix text`, async () => {
      setup();
      renderAuth(route);
      await screen.findByRole("heading", { level: 1, name: title });

      const sondix = screen.getAllByText("Sondix");
      expect(sondix).toHaveLength(1);
      expect(sondix[0]).toHaveAttribute("data-slot", "logo");
      expect(screen.queryByRole("img", { name: "Sondix" })).not.toBeInTheDocument();
    });
  }
});
