import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { Toaster } from "sonner";
import { describe, expect, it, vi } from "vitest";
import Surveys from "@/components/Surveys";
import { mockFetch } from "./helpers";

const list = "GET /api/v1/surveys";
const summary = "GET /api/v1/stats/surveys";
const activeStats = "GET /api/v1/stats/surveys/active";

const survey = (i: number, extra: Record<string, unknown> = {}) => ({
  id: `id-${i}`,
  name: `Encuesta ${i}`,
  slug: `encuesta-${i}`,
  questions: [],
  isActive: i % 2 === 0,
  isLocked: false,
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
  deletedAt: null,
  activatedAt: null,
  answerCount: 0,
  completedCount: 0,
  ...extra,
});

const activeItem = (i: number, total = 10, completed = 6) => ({
  slug: `activa-${i}`,
  name: `Activa ${i}`,
  totalAnswers: total,
  completedAnswers: completed,
  incompleteAnswers: total - completed,
});

type Options = {
  total?: number;
  counts?: { all: number; active: number };
  active?: unknown[];
  items?: unknown[];
};

// Replies with one page of `total` surveys and records every URL requested.
function mockApi({
  total = 3,
  counts = { all: 42, active: 7 },
  active = [],
  items,
}: Options = {}) {
  const urls: URL[] = [];
  const summaryUrls: URL[] = [];
  const fetchMock = mockFetch({
    [summary]: (url) => {
      summaryUrls.push(new URL(url));
      return { status: 200, body: { data: counts } };
    },
    [activeStats]: { status: 200, body: { data: active } },
    "PATCH /api/v1/surveys/encuesta-1": {
      status: 200,
      body: { data: survey(1, { isActive: true }) },
    },
    [list]: (url) => {
      const u = new URL(url);
      urls.push(u);
      const page = Number(u.searchParams.get("page") ?? 1);
      const pageItems =
        items ??
        Array.from(
          { length: Math.max(0, Math.min(10, total - (page - 1) * 10)) },
          (_, i) => survey((page - 1) * 10 + i + 1),
        );
      return {
        status: 200,
        body: {
          data: pageItems,
          meta: { results: pageItems.length, total, page, limit: 10 },
        },
      };
    },
  });
  return { urls, summaryUrls, fetchMock };
}

const last = (urls: URL[]) => urls[urls.length - 1]!.searchParams;

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}
const currentSearch = () => screen.getByTestId("location").textContent ?? "";

// Renders the dashboard list with a spied QueryClient and the current URL.
function renderDashboard(route = "/dashboard") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <>
                <Surveys />
                <LocationProbe />
              </>
            }
          />
          <Route path="*" element={<p>other page</p>} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  );
  return { invalidate };
}

const invalidatedKeys = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));

describe("Survey list: title, summary line and table (REQ-FE-017)", () => {
  it("AC-FE-017-1: the summary line comes from /stats/surveys, whatever filters the list has", async () => {
    const { summaryUrls } = mockApi({ counts: { all: 12, active: 4 } });
    renderDashboard("/dashboard?search=x&active=false");

    expect(screen.getByRole("heading", { level: 1, name: "Encuestas" })).toHaveClass("text-h1");
    const line = await screen.findByText("12 encuestas · 4 activas · 8 inactivas");
    expect(line).toHaveClass("text-small", "text-ink-muted", "figures");
    expect(summaryUrls.every((u) => u.search === "")).toBe(true);
  });

  it("AC-FE-017-2: singulars when a count is 1", async () => {
    mockApi({ counts: { all: 1, active: 1 } });
    renderDashboard();

    expect(await screen.findByText("1 encuesta · 1 activa · 0 inactivas")).toBeInTheDocument();
  });

  it("AC-FE-017-3: Crear encuesta button and the table columns, numeric ones right-aligned in tabular figures", async () => {
    mockApi({ total: 1 });
    renderDashboard();
    const user = userEvent.setup();

    expect(screen.getByRole("link", { name: "Crear encuesta" })).toHaveAttribute(
      "href",
      "/dashboard/surveys/create",
    );
    const nameLink = await screen.findByRole("link", { name: "Encuesta 1" });
    expect(nameLink).toHaveAttribute("href", "/dashboard/surveys/encuesta-1");

    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent?.trim())).toEqual([
      "Nombre",
      "Estado",
      "Respuestas",
      "Completas",
      "Fecha de creación",
      "Acciones",
    ]);
    for (const i of [2, 3, 4]) expect(headers[i]).toHaveClass("text-right");

    const row = nameLink.closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    for (const i of [2, 3, 4]) expect(cells[i]).toHaveClass("figures", "text-right");
    expect(cells[4]).toHaveTextContent(new Date("2026-10-01T12:00:00.000Z").toLocaleDateString("es-CU"));
    expect(within(cells[1]!).getByText("Inactiva")).toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: "Acciones de Encuesta 1" }));
    expect(await screen.findByRole("menuitem", { name: "Ver detalles" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Activar" })).toBeInTheDocument();
  });

  it("AC-FE-017-4: Respuestas and Completas show answerCount and completedCount", async () => {
    mockApi({ total: 1, items: [survey(1, { answerCount: 83, completedCount: 71 })] });
    renderDashboard();

    const row = (await screen.findByRole("link", { name: "Encuesta 1" })).closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent(/^83$/);
    expect(cells[3]).toHaveTextContent(/^71$/);
  });

  it("AC-FE-017-5: activating from the list invalidates the list, the summary and the active-survey statistics", async () => {
    const { fetchMock } = mockApi({ total: 1 });
    const { invalidate } = renderDashboard();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Acciones de Encuesta 1" }));
    await user.click(await screen.findByRole("menuitem", { name: "Activar" }));

    await waitFor(() =>
      expect(invalidatedKeys(invalidate)).toEqual(
        expect.arrayContaining([
          JSON.stringify(["/api/v1/surveys"]),
          JSON.stringify(["/api/v1/stats/surveys"]),
          JSON.stringify(["/api/v1/stats/surveys/active"]),
        ]),
      ),
    );
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patch![1]!.body))).toEqual({ isActive: true });
  });
});

describe("Paginated, searchable, filterable list (REQ-FE-018)", () => {
  it("AC-FE-018-1: with no query string it asks page 1, 10 per page, newest first", async () => {
    const { urls } = mockApi();
    renderDashboard();
    await screen.findByText("Encuesta 1");

    const params = last(urls);
    expect(params.get("page") ?? "1").toBe("1");
    expect(params.get("limit") ?? "10").toBe("10");
    // Newest first: no sort, or the equivalent default -creation (REQ-SURV-020).
    expect([null, "-creation"]).toContain(params.get("sort"));
    expect(currentSearch()).toBe("");
  });

  it("AC-FE-018-2: searches 300 ms after typing pauses, puts it in the URL and goes back to page 1", async () => {
    const { urls } = mockApi({ total: 23 });
    renderDashboard("/dashboard?page=2");
    const user = userEvent.setup();
    await screen.findByText("Encuesta 11");

    const box = screen.getByRole("searchbox", { name: "Buscar encuestas por nombre" });
    expect(box).toHaveAttribute("placeholder", "Buscar por nombre");
    await user.type(box, "clima");
    // Not on every keystroke.
    expect(urls.some((u) => u.searchParams.get("search") === "c")).toBe(false);
    await waitFor(() => expect(last(urls).get("search")).toBe("clima"));
    expect(last(urls).get("page")).toBeNull();
    expect(currentSearch()).toBe("?search=clima");
  });

  it("AC-FE-018-3: the Activas chip is pressed, filters the list, goes to the URL and back to page 1", async () => {
    const { urls } = mockApi({ total: 23 });
    renderDashboard("/dashboard?page=2");
    const user = userEvent.setup();
    await screen.findByText("Encuesta 11");

    const chips = within(screen.getByRole("group", { name: "Filtrar por estado" }));
    expect(chips.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Todas",
      "Activas",
      "Inactivas",
    ]);
    expect(chips.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");

    await user.click(chips.getByRole("button", { name: "Activas" }));
    await waitFor(() => expect(last(urls).get("active")).toBe("true"));
    expect(chips.getByRole("button", { name: "Activas" })).toHaveAttribute("aria-pressed", "true");
    expect(chips.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "false");
    expect(last(urls).get("page")).toBeNull();
    expect(currentSearch()).toBe("?active=true");
  });

  it("AC-FE-018-4: the Nombre and Fecha de creación headers sort both ways, with sort in the URL and page 1", async () => {
    const { urls } = mockApi({ total: 23 });
    renderDashboard("/dashboard?page=2");
    const user = userEvent.setup();
    await screen.findByText("Encuesta 11");

    const nameHeader = () => screen.getAllByRole("columnheader")[0]!;
    const dateHeader = () => screen.getAllByRole("columnheader")[4]!;
    expect(dateHeader()).toHaveAttribute("aria-sort", "descending");
    expect(nameHeader()).toHaveAttribute("aria-sort", "none");

    await user.click(within(nameHeader()).getByRole("button", { name: /Nombre/ }));
    await waitFor(() => expect(last(urls).get("sort")).toBe("name"));
    expect(last(urls).get("page")).toBeNull();
    expect(currentSearch()).toBe("?sort=name");
    expect(nameHeader()).toHaveAttribute("aria-sort", "ascending");

    await user.click(within(nameHeader()).getByRole("button", { name: /Nombre/ }));
    await waitFor(() => expect(last(urls).get("sort")).toBe("-name"));
    expect(nameHeader()).toHaveAttribute("aria-sort", "descending");

    await user.click(within(dateHeader()).getByRole("button", { name: /Fecha de creación/ }));
    await waitFor(() => expect(last(urls).get("sort")).toBe("creation"));
    expect(dateHeader()).toHaveAttribute("aria-sort", "ascending");
    expect(currentSearch()).toBe("?sort=creation");

    await user.click(within(dateHeader()).getByRole("button", { name: /Fecha de creación/ }));
    await waitFor(() => expect(last(urls).get("sort")).toBe("-creation"));
    // The default sort is omitted from the URL.
    expect(currentSearch()).toBe("");
  });

  it("AC-FE-018-5: pagination with meta.total = 43 on page 2", async () => {
    const { urls } = mockApi({ total: 43 });
    renderDashboard("/dashboard?page=2");
    const user = userEvent.setup();

    expect(await screen.findByText("Mostrando 11–20 de 43")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(await screen.findByText("Mostrando 21–30 de 43")).toBeInTheDocument();
    expect(last(urls).get("page")).toBe("3");
    expect(currentSearch()).toBe("?page=3");
    await user.click(screen.getByRole("button", { name: /Anterior/ }));
    await user.click(await screen.findByRole("button", { name: /Anterior/ }));
    await screen.findByText("Mostrando 1–10 de 43");
    // Page 1 is the default: omitted from the URL.
    expect(currentSearch()).toBe("");
  });

  it("AC-FE-018-6: the URL's search, status, sort and page drive the request and the controls", async () => {
    const { urls } = mockApi({ total: 23 });
    renderDashboard("/dashboard?search=x&active=false&sort=name&page=2");
    await screen.findByText("Encuesta 11");

    const params = last(urls);
    expect(params.get("search")).toBe("x");
    expect(params.get("active")).toBe("false");
    expect(params.get("sort")).toBe("name");
    expect(params.get("page")).toBe("2");

    expect(screen.getByRole("searchbox", { name: "Buscar encuestas por nombre" })).toHaveValue("x");
    expect(screen.getByRole("button", { name: "Inactivas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
  });

  it("AC-FE-018-7: while a new page loads the previous one stays visible, dimmed", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const page = (n: number) =>
      new Response(
        JSON.stringify({
          data: Array.from({ length: 10 }, (_, i) => survey((n - 1) * 10 + i + 1)),
          meta: { results: 10, total: 30, page: n, limit: 10 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const u = new URL(String(input), "http://localhost");
        const json = (body: unknown) =>
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        if (u.pathname === "/api/v1/stats/surveys") return json({ data: { all: 30, active: 0 } });
        if (u.pathname === "/api/v1/stats/surveys/active") return json({ data: [] });
        const n = Number(u.searchParams.get("page") ?? 1);
        if (n === 2) await gate;
        return page(n);
      }),
    );
    renderDashboard();
    const user = userEvent.setup();
    await screen.findByText("Encuesta 1");

    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    const wrapper = screen.getByText("Encuesta 1").closest("[aria-busy]")!;
    await waitFor(() => expect(wrapper).toHaveClass("opacity-50"));
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper.className).not.toMatch(/animate|transition/);

    release();
    expect(await screen.findByText("Encuesta 11")).toBeInTheDocument();
    expect(screen.queryByText("Encuesta 1")).not.toBeInTheDocument();
    expect(screen.getByText("Encuesta 11").closest("[aria-busy]")).not.toHaveClass("opacity-50");
  });

  it("AC-FE-018-8: empty states with and without filters", async () => {
    mockApi({ total: 0 });
    renderDashboard("/dashboard?active=true");
    expect(
      await screen.findByText("Ninguna encuesta coincide con la búsqueda o el filtro."),
    ).toHaveClass("text-ink-muted");
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });

  it("AC-FE-018-8: with no filters, the empty list invites to create the first survey", async () => {
    mockApi({ total: 0 });
    renderDashboard();
    const list = screen.getByRole("region", { name: "Lista de encuestas" });
    const invite = await within(list).findByRole("link", { name: "Crear la primera encuesta" });
    expect(invite).toHaveAttribute("href", "/dashboard/surveys/create");
    expect(
      screen.queryByText("Ninguna encuesta coincide con la búsqueda o el filtro."),
    ).not.toBeInTheDocument();
  });

  it("AC-FE-018-9: there is no control for the API's date filter", async () => {
    const { urls } = mockApi();
    renderDashboard();
    await screen.findByText("Encuesta 1");

    const list = screen.getByRole("region", { name: "Lista de encuestas" });
    expect(within(list).queryByLabelText(/fecha/i, { selector: "input,select" })).toBeNull();
    expect(list.querySelector('input[type="date"]')).toBeNull();
    expect(urls.every((u) => !u.searchParams.has("date"))).toBe(true);
  });

  it("REQ-BRAND-033: the list shows skeleton rules while pending and an error line with Reintentar", async () => {
    let fail = true;
    mockFetch({
      [summary]: { status: 200, body: { data: { all: 1, active: 0 } } },
      [activeStats]: { status: 200, body: { data: [] } },
      [list]: () =>
        fail
          ? { status: 500, body: { title: "Error", status: 500 } }
          : {
              status: 200,
              body: { data: [survey(1)], meta: { results: 1, total: 1, page: 1, limit: 10 } },
            },
    });
    renderDashboard();

    expect(screen.getByRole("status", { name: "Cargando encuestas..." })).toBeInTheDocument();
    const alert = await screen.findByText("Error al cargar las encuestas");
    expect(alert).toHaveClass("text-rust");
    fail = false;
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Encuesta 1")).toBeInTheDocument();
  });
});

describe("Locked badge in the dashboard table (REQ-FE-026)", () => {
  it("AC-FE-026-1, AC-FE-026-2: a locked survey shows Bloqueada next to its status, with its tooltip on focus", async () => {
    mockApi({
      total: 2,
      items: [survey(1, { isLocked: true, isActive: true }), survey(3)],
    });
    renderDashboard();
    const user = userEvent.setup();

    const lockedRow = (await screen.findByText("Encuesta 1")).closest("tr")!;
    const otherRow = screen.getByText("Encuesta 3").closest("tr")!;
    const status = within(lockedRow).getAllByRole("cell")[1]!;
    expect(within(status).getByText("Activa")).toBeInTheDocument();
    const badge = within(status).getByText("Bloqueada");
    expect(badge.querySelector("svg")).not.toBeNull();
    expect(within(otherRow).queryByText("Bloqueada")).not.toBeInTheDocument();

    await user.tab();
    while (!badge.parentElement!.contains(document.activeElement) && document.activeElement !== badge.parentElement) {
      await user.tab();
      if (document.activeElement === document.body) break;
    }
    expect(badge.parentElement).toHaveFocus();
    expect(
      (await screen.findAllByText("Ya fue activada: nombre y preguntas no se pueden modificar"))[0],
    ).toBeInTheDocument();
  });
});

describe("Active surveys small multiples on the dashboard (REQ-FE-032)", () => {
  it("AC-FE-032-1: 3 cells in the order received, linked names, totals, both bars and the common scale caption", async () => {
    mockApi({
      counts: { all: 5, active: 3 },
      active: [activeItem(1, 83, 71), activeItem(2, 41, 40), activeItem(3, 12, 0)],
    });
    renderDashboard();

    await screen.findByText("Escala común: 0–100 respuestas");
    const section = screen.getByRole("region", { name: "Encuestas activas" });
    const cells = within(section).getAllByRole("listitem");
    expect(cells).toHaveLength(3);
    expect(cells.map((c) => within(c).getByRole("link").textContent)).toEqual([
      "Activa 1",
      "Activa 2",
      "Activa 3",
    ]);
    expect(within(cells[0]!).getByRole("link")).toHaveAttribute("href", "/dashboard/surveys/activa-1");
    const figure = cells[0]!.querySelector("p.text-figure")!;
    expect(figure).toHaveTextContent("83 respuestas");
    for (const cell of cells) {
      expect(within(cell).getByText("Completas")).toBeInTheDocument();
      expect(within(cell).getByText("Incompletas")).toBeInTheDocument();
    }
    expect(within(section).getByText("Escala común: 0–100 respuestas")).toBeInTheDocument();
    // Between the header row and the survey list.
    const h1 = screen.getByRole("heading", { level: 1 });
    const listSection = screen.getByRole("region", { name: "Lista de encuestas" });
    expect(h1.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(section.compareDocumentPosition(listSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("AC-FE-032-3: 71 completed and 12 incomplete on a scale of 100 draw teal 71% and rust 12%, with the numbers as text", async () => {
    mockApi({ counts: { all: 1, active: 1 }, active: [activeItem(1, 83, 71)] });
    renderDashboard();

    const section = await screen.findByRole("region", { name: "Encuestas activas" });
    await within(section).findByText("Escala común: 0–100 respuestas");
    const [completas, incompletas] = Array.from(
      section.querySelectorAll<HTMLElement>('[data-slot="bar"]'),
    );
    const fill = (bar: HTMLElement) => bar.querySelector<HTMLElement>('[aria-hidden="true"] > span')!;
    expect(fill(completas!)).toHaveClass("bg-teal");
    expect(fill(completas!).style.width).toBe("71%");
    expect(within(completas!).getByText("71")).toBeInTheDocument();
    expect(fill(incompletas!)).toHaveClass("bg-rust");
    expect(fill(incompletas!).style.width).toBe("12%");
    expect(within(incompletas!).getByText("12")).toBeInTheDocument();
  });

  it("AC-FE-032-4: Ver todas las activas filters the list to Activas on page 1 and moves focus to the list", async () => {
    const { urls } = mockApi({
      total: 23,
      counts: { all: 20, active: 11 },
      active: Array.from({ length: 8 }, (_, i) => activeItem(i + 1)),
    });
    renderDashboard("/dashboard?page=2&search=a");
    const user = userEvent.setup();

    const link = await screen.findByRole("link", { name: "Ver todas las activas" });
    await user.click(link);

    await waitFor(() => expect(last(urls).get("active")).toBe("true"));
    expect(last(urls).get("page")).toBeNull();
    const params = new URLSearchParams(currentSearch());
    expect(params.get("active")).toBe("true");
    expect(params.has("page")).toBe(false);
    expect(screen.getByRole("button", { name: "Activas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Lista de encuestas" })).toHaveFocus();
  });

  it("AC-FE-032-5: no Ver todas las activas link when every active survey is shown", async () => {
    mockApi({
      counts: { all: 9, active: 8 },
      active: Array.from({ length: 8 }, (_, i) => activeItem(i + 1)),
    });
    renderDashboard();

    const section = await screen.findByRole("region", { name: "Encuestas activas" });
    await within(section).findByText(/Escala común/);
    await screen.findByText("9 encuestas · 8 activas · 1 inactiva");
    expect(screen.queryByRole("link", { name: "Ver todas las activas" })).not.toBeInTheDocument();
  });

  it("AC-FE-032-6: with no active survey the row is replaced by the muted line between the two rules", async () => {
    mockApi({ counts: { all: 3, active: 0 }, active: [] });
    renderDashboard();

    const line = await screen.findByText(
      "No hay encuestas activas. Activa una encuesta para empezar a recoger respuestas.",
    );
    expect(line).toHaveClass("text-ink-muted");
    const section = screen.getByRole("region", { name: "Encuestas activas" });
    expect(section).toHaveClass("border-y", "border-rule-strong");
    expect(within(section).queryByRole("list")).toBeNull();
  });

  it("AC-FE-032-7: on error the row shows the error line with Reintentar and the list still renders", async () => {
    let fail = true;
    mockFetch({
      [summary]: { status: 200, body: { data: { all: 1, active: 1 } } },
      [activeStats]: () =>
        fail
          ? { status: 500, body: { title: "Error", status: 500 } }
          : { status: 200, body: { data: [activeItem(1)] } },
      [list]: {
        status: 200,
        body: { data: [survey(1)], meta: { results: 1, total: 1, page: 1, limit: 10 } },
      },
    });
    renderDashboard();

    const message = await screen.findByText("Error al cargar las encuestas activas");
    const section = screen.getByRole("region", { name: "Encuestas activas" });
    expect(section).toContainElement(message);
    expect(message).toHaveClass("text-rust");
    expect(await screen.findByText("Encuesta 1")).toBeInTheDocument();

    fail = false;
    await userEvent.setup().click(within(section).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("link", { name: "Activa 1" })).toBeInTheDocument();
  });

  it("REQ-FE-032: skeleton cells while the active statistics load; the list does not wait for them", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const u = new URL(String(input), "http://localhost");
        const json = (body: unknown) =>
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        if (u.pathname === "/api/v1/stats/surveys") return json({ data: { all: 1, active: 1 } });
        if (u.pathname === "/api/v1/stats/surveys/active") {
          await gate;
          return json({ data: [activeItem(1)] });
        }
        return json({ data: [survey(1)], meta: { results: 1, total: 1, page: 1, limit: 10 } });
      }),
    );
    renderDashboard();

    const section = screen.getByRole("region", { name: "Encuestas activas" });
    expect(within(section).getByRole("status", { name: "Cargando..." })).toBeInTheDocument();
    expect(section.querySelector(".animate-pulse")).toBeNull();
    expect(await screen.findByText("Encuesta 1")).toBeInTheDocument();
    expect(within(section).getByRole("status", { name: "Cargando..." })).toBeInTheDocument();
    release();
    expect(await within(section).findByRole("link", { name: "Activa 1" })).toBeInTheDocument();
  });
});
