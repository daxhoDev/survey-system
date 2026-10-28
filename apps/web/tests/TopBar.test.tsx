import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import TopBar from "@/components/TopBar";
import { setTheme } from "@/lib/theme";
import { mockFetch, renderWithProviders } from "./helpers";

// jsdom applies no CSS, so both the `md` bar (hidden below md) and the
// mobile menu button (hidden from md) are in the DOM; each test scopes its
// queries to the part of the bar for the width it describes.
const me = {
  "GET /api/v1/users/me": {
    status: 200,
    body: { data: { id: "u1", username: "owner", email: "owner@example.com" } },
  },
};

function renderBar(route = "/dashboard") {
  return renderWithProviders(<TopBar />, { path: "/dashboard/*", route });
}

const header = () => screen.getByRole("banner");
const barNav = () =>
  within(header()).getByRole("navigation", { name: "Secciones" });

afterEach(() => {
  // The theme module keeps the choice in memory: back to the default.
  setTheme("system");
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("TopBar (REQ-FE-016, REQ-FE-029, REQ-FE-031)", () => {
  it("AC-FE-016-1: from md shows logo link, sections, Tema, username and Salir in order, above a 2 px strong rule", async () => {
    mockFetch(me);
    renderBar();
    await screen.findAllByText("owner");

    const bar = header();
    expect(bar).toHaveClass("h-[58px]", "border-b-2", "border-rule-strong");

    const logo = within(bar).getByRole("link", { name: "Sondix, ir a encuestas" });
    expect(logo).toHaveAttribute("href", "/dashboard");
    const encuestas = within(barNav()).getByRole("link", { name: "Encuestas" });
    const invitaciones = within(barNav()).getByRole("link", { name: "Invitaciones" });
    const tema = within(bar).getByRole("button", { name: "Tema" });
    const username = within(bar).getAllByText("owner")[0]!;
    const salir = within(bar).getByRole("button", { name: "Salir" });

    const order = [logo, encuestas, invitaciones, tema, username, salir];
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(username).toHaveClass("text-ink-muted");
    expect(salir).toHaveAttribute("data-variant", "ghost");
  });

  it("AC-FE-031-1: the navigation holds only Encuestas and Invitaciones", async () => {
    mockFetch(me);
    renderBar();
    await screen.findAllByText("owner");

    const links = within(barNav()).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Encuestas", "/dashboard"],
      ["Invitaciones", "/dashboard/invitations"],
    ]);
  });

  it.each([
    ["/dashboard", "Encuestas", "Invitaciones"],
    ["/dashboard/surveys/some-survey", "Encuestas", "Invitaciones"],
    ["/dashboard/invitations", "Invitaciones", "Encuestas"],
  ])(
    "AC-FE-031-2: on %s, %s is the current section (bold, teal underline)",
    async (route, current, other) => {
      mockFetch(me);
      renderBar(route);
      await screen.findAllByText("owner");

      const active = within(barNav()).getByRole("link", { name: current });
      expect(active).toHaveAttribute("aria-current", "page");
      expect(active).toHaveClass("font-bold", "after:h-0.5", "after:bg-teal");
      const inactive = within(barNav()).getByRole("link", { name: other });
      expect(inactive).not.toHaveAttribute("aria-current");
      expect(inactive).toHaveClass("hover:after:bg-rule");
    },
  );

  it("AC-BRAND-011-6 / AC-FE-029-1: the Tema button opens Claro, Oscuro, Sistema as radio items", async () => {
    mockFetch(me);
    renderBar();
    await screen.findAllByText("owner");
    const user = userEvent.setup();

    await user.click(within(header()).getByRole("button", { name: "Tema" }));
    expect(screen.getByRole("menuitemradio", { name: "Claro" })).not.toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "Oscuro" })).not.toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "Sistema" })).toBeChecked();

    await user.click(screen.getByRole("menuitemradio", { name: "Oscuro" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("sondix-theme")).toBe("dark");
  });

  it("AC-FE-016-2 / AC-FE-029-1: below md the menu sheet holds sections, the Tema radio group, username and Salir, and closes on navigation", async () => {
    mockFetch(me);
    renderBar();
    await screen.findAllByText("owner");
    const user = userEvent.setup();

    const menuButton = within(header()).getByRole("button", { name: "Abrir menú" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const sheet = screen.getByRole("dialog");
    const nav = within(sheet).getByRole("navigation", { name: "Secciones" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Encuestas",
      "Invitaciones",
    ]);
    expect(within(nav).getByRole("link", { name: "Encuestas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const tema = within(sheet).getByRole("radiogroup", { name: "Tema" });
    expect(within(tema).getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual([
      "light",
      "dark",
      "system",
    ]);
    for (const label of ["Claro", "Oscuro", "Sistema"]) {
      expect(within(tema).getByLabelText(label)).toBeInTheDocument();
    }
    expect(within(tema).getByLabelText("Sistema")).toBeChecked();
    expect(within(sheet).getByText("owner")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Salir" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Cerrar menú" })).toBeInTheDocument();

    await user.click(within(nav).getByRole("link", { name: "Invitaciones" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("AC-FE-016-2: the sheet closes on Escape and with Cerrar menú", async () => {
    mockFetch(me);
    renderBar();
    await screen.findAllByText("owner");
    const user = userEvent.setup();
    const menuButton = within(header()).getByRole("button", { name: "Abrir menú" });

    await user.click(menuButton);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(menuButton);
    await user.click(screen.getByRole("button", { name: "Cerrar menú" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("the sheet's Tema radio group applies the theme", async () => {
    mockFetch(me);
    renderBar();
    await screen.findAllByText("owner");
    const user = userEvent.setup();

    await user.click(within(header()).getByRole("button", { name: "Abrir menú" }));
    await user.click(screen.getByLabelText("Claro"));
    expect(localStorage.getItem("sondix-theme")).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("AC-FE-016-3 / AC-FE-025-2: Salir asks for confirmation, then clears the cache and goes to /auth/login", async () => {
    const fetchMock = mockFetch({ ...me, "POST /api/v1/users/logout": { status: 204 } });
    renderBar();
    await screen.findAllByText("owner");
    const user = userEvent.setup();

    await user.click(within(barNav().closest("header")!).getAllByRole("button", { name: "Salir" })[0]!);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Confirma tu acción");
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/users/logout"),
      expect.anything(),
    );
    await user.click(within(dialog).getByRole("button", { name: "Salir" }));

    expect(await screen.findByText("other page")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/users/logout"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("AC-FE-016-3: Salir from the menu sheet also asks for confirmation", async () => {
    mockFetch({ ...me, "POST /api/v1/users/logout": { status: 204 } });
    renderBar();
    await screen.findAllByText("owner");
    const user = userEvent.setup();

    await user.click(within(header()).getByRole("button", { name: "Abrir menú" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Salir" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Confirma tu acción");
    await user.click(within(dialog).getByRole("button", { name: "Salir" }));
    expect(await screen.findByText("other page")).toBeInTheDocument();
  });

  it("AC-FE-016-4: without a user once loaded it shows Redirigiendo... instead of username and Salir", async () => {
    mockFetch({ "GET /api/v1/users/me": { status: 401, body: { detail: "No autenticado" } } });
    renderBar();

    expect(await within(header()).findByText("Redirigiendo...")).toBeInTheDocument();
    expect(within(header()).queryByRole("button", { name: "Salir" })).not.toBeInTheDocument();
    expect(screen.queryByText("Redirecting...")).not.toBeInTheDocument();
  });

  it("AC-BRAND-001-3 / AC-BRAND-021-4 / AC-FE-029-2: Sondix appears only as the default Logo component, once in the bar and once in the sheet", async () => {
    mockFetch(me);
    renderBar();
    await screen.findAllByText("owner");

    const expectOneDefaultLogo = (scope: HTMLElement) => {
      const logos = scope.querySelectorAll('[data-slot="logo"]');
      expect(logos).toHaveLength(1);
      expect(logos[0]).not.toHaveAttribute("data-variant");
      const sondix = within(scope).getAllByText("Sondix");
      expect(sondix).toHaveLength(1);
      expect(sondix[0]!.closest('[data-slot="logo"]')).toBe(logos[0]);
    };

    expectOneDefaultLogo(header());
    // The bar's logo is the link to /dashboard with its own accessible name.
    const link = within(header()).getByRole("link", { name: "Sondix, ir a encuestas" });
    expect(link.querySelector('[data-slot="logo"]')).not.toBeNull();

    await userEvent.setup().click(within(header()).getByRole("button", { name: "Abrir menú" }));
    expectOneDefaultLogo(screen.getByRole("dialog"));
  });

  it("AC-BRAND-017-1: every icon-only button of the bar has an accessible name", async () => {
    mockFetch(me);
    renderBar();
    await screen.findAllByText("owner");
    for (const button of within(header()).getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
    }
  });
});
