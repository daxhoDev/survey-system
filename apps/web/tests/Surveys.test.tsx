import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Surveys from "@/components/Surveys";
import { mockFetch, renderWithProviders } from "./helpers";

const list = "GET /api/v1/surveys";
const summary = "GET /api/v1/stats/surveys";

const survey = (i: number) => ({
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
});

// Replies with one page of `total` surveys and records every list URL.
function mockList(total: number) {
  const urls: URL[] = [];
  mockFetch({
    [summary]: { status: 200, body: { data: { all: 42, active: 7 } } },
    [list]: (url) => {
      const u = new URL(url);
      urls.push(u);
      const page = Number(u.searchParams.get("page") ?? 1);
      const items = Array.from(
        { length: Math.max(0, Math.min(10, total - (page - 1) * 10)) },
        (_, i) => survey((page - 1) * 10 + i + 1),
      );
      return {
        status: 200,
        body: { data: items, meta: { results: items.length, total, page, limit: 10 } },
      };
    },
  });
  return urls;
}

const last = (urls: URL[]) => urls[urls.length - 1]!.searchParams;

describe("Surveys list (FE-17, FE-18)", () => {
  it("shows the counters from /stats/surveys and asks newest first", async () => {
    const urls = mockList(3);
    renderWithProviders(<Surveys />, { path: "/dashboard", route: "/dashboard" });

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(await screen.findByText("Encuesta 1")).toBeInTheDocument();
    expect(last(urls).get("sort")).toBe("-creation");
  });

  it("paginates with the API total", async () => {
    const urls = mockList(23);
    renderWithProviders(<Surveys />, { path: "/dashboard", route: "/dashboard" });
    const user = userEvent.setup();

    expect(await screen.findByText("Mostrando 1–10 de 23")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(await screen.findByText("Mostrando 11–20 de 23")).toBeInTheDocument();
    expect(last(urls).get("page")).toBe("2");
  });

  it("searches by name after typing pauses, filters by status and sorts by column", async () => {
    const urls = mockList(3);
    renderWithProviders(<Surveys />, { path: "/dashboard", route: "/dashboard" });
    const user = userEvent.setup();
    await screen.findByText("Encuesta 1");

    await user.type(screen.getByLabelText("Buscar encuestas por nombre"), "clima");
    await waitFor(() => expect(last(urls).get("search")).toBe("clima"));

    await user.click(screen.getByRole("button", { name: "Activas" }));
    await waitFor(() => expect(last(urls).get("active")).toBe("true"));
    expect(screen.getByRole("button", { name: "Activas" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /^Nombre/ }));
    await waitFor(() => expect(last(urls).get("sort")).toBe("name"));
    expect(last(urls).get("search")).toBe("clima");
  });

  it("explains an empty result when filters are applied", async () => {
    mockList(0);
    renderWithProviders(<Surveys />, {
      path: "/dashboard",
      route: "/dashboard?search=zzz",
    });

    expect(
      await screen.findByText("Ninguna encuesta coincide con la búsqueda o el filtro."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });
});
