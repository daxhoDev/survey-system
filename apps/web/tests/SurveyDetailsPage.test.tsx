import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import SurveyDetailsPage from "@/pages/SurveyDetailsPage";
import { mockFetch } from "./helpers";

const survey = {
  id: "1",
  name: "Clima laboral",
  slug: "clima-laboral",
  questions: [{ id: 1, name: "¿Cómo te sientes?", type: "TEXT_ANSWER", isRequired: false }],
  isActive: false,
  isLocked: false,
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: null,
  deletedAt: null,
  activatedAt: null,
};

const expectedKeys = [
  JSON.stringify(["/api/v1/surveys"]),
  JSON.stringify(["/api/v1/stats/surveys"]),
  JSON.stringify(["/api/v1/stats/surveys/active"]),
];

function renderDetails() {
  mockFetch({
    "GET /api/v1/surveys/clima-laboral": { status: 200, body: { data: survey } },
    "PATCH /api/v1/surveys/clima-laboral": {
      status: 200,
      body: { data: { ...survey, isActive: true, isLocked: true } },
    },
    "DELETE /api/v1/surveys/clima-laboral": { status: 204 },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard/surveys/clima-laboral"]}>
        <Routes>
          <Route path="/dashboard/surveys/:slug" element={<SurveyDetailsPage />} />
          <Route path="/dashboard" element={<p>dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const keys = () => invalidate.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
  return { keys };
}

describe("SurveyDetailsPage invalidations (REQ-FE-017)", () => {
  it("AC-FE-017-5: activating a survey invalidates the list, the summary and the active-survey statistics", async () => {
    const { keys } = renderDetails();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Activar" }));

    await waitFor(() => expect(keys()).toEqual(expect.arrayContaining(expectedKeys)));
  });

  it("AC-FE-017-5: deleting a survey invalidates the list, the summary and the active-survey statistics", async () => {
    const { keys } = renderDetails();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("dashboard")).toBeInTheDocument();
    await waitFor(() => expect(keys()).toEqual(expect.arrayContaining(expectedKeys)));
  });
});

// FRONTEND.md REQ-FE-020, 021, 022, 025, 026.
const fullSurvey = {
  ...survey,
  isActive: true,
  isLocked: true,
  questions: [
    { id: 1, name: "¿Cómo te sientes?", type: "TEXT_ANSWER", isRequired: true },
    {
      id: 2,
      name: "¿Qué valoras más?",
      type: "MULTI_SELECT",
      isRequired: false,
      options: [
        { id: 1, content: "Salario" },
        { id: 2, content: "Horario" },
        { id: 3, content: "Equipo" },
      ],
    },
  ],
};

const answer = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  surveyId: "1",
  responses: [
    { id: 1, content: "Bien, gracias" },
    { id: 2, content: [1, 3] },
  ],
  originIp: "10.0.0.7",
  createdAt: "2026-10-03T09:30:00.000Z",
  deletedAt: null,
};

const stats = {
  totalAnswers: 1,
  completedAnswers: 1,
  incompleteAnswers: 0,
  questionCount: 2,
  optionStats: [
    {
      questionId: 2,
      questionName: "¿Qué valoras más?",
      options: [
        { optionContent: "Salario", responseCount: 1 },
        { optionContent: "Horario", responseCount: 0 },
        { optionContent: "Equipo", responseCount: 1 },
      ],
    },
  ],
};

function renderFull(state?: unknown) {
  const fetchMock = mockFetch({
    "GET /api/v1/surveys/clima-laboral": { status: 200, body: { data: fullSurvey } },
    "GET /api/v1/surveys/clima-laboral/answers": { status: 200, body: { data: [answer] } },
    "GET /api/v1/surveys/clima-laboral/stats": { status: 200, body: { data: stats } },
    [`DELETE /api/v1/surveys/clima-laboral/answers/${answer.id}`]: { status: 204 },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[{ pathname: "/dashboard/surveys/clima-laboral", state }]}
      >
        <Routes>
          <Route path="/dashboard/surveys/:slug" element={<SurveyDetailsPage />} />
          <Route path="/dashboard" element={<p>dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const requested = () =>
    fetchMock.mock.calls.map(
      ([url, init]) => `${init?.method ?? "GET"} ${new URL(String(url), "http://localhost").pathname}`,
    );
  return { ...view, requested, user: userEvent.setup() };
}

describe("SurveyDetailsPage header (REQ-FE-021, REQ-FE-026)", () => {
  it("AC-FE-021-1 / AC-FE-026-1: name, status, locked badge, slug, activate/deactivate and delete", async () => {
    renderFull();

    const title = await screen.findByRole("heading", { level: 1, name: "Clima laboral" });
    expect(title).toHaveClass("text-h1");
    const header = title.closest("header") as HTMLElement;
    expect(within(header).getByText("Activa")).toBeInTheDocument();
    expect(within(header).getByText("Bloqueada")).toBeInTheDocument();
    expect(within(header).getByText("clima-laboral")).toHaveClass("text-ink-muted");
    expect(within(header).getByRole("button", { name: "Desactivar" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("AC-FE-026-1: an unlocked inactive survey shows 'Activar' and no locked badge", async () => {
    renderDetails();

    const title = await screen.findByRole("heading", { level: 1, name: "Clima laboral" });
    const header = title.closest("header") as HTMLElement;
    expect(within(header).getByRole("button", { name: "Activar" })).toBeInTheDocument();
    expect(within(header).queryByText("Bloqueada")).not.toBeInTheDocument();
  });

  it("REQ-FE-021: the back link 'Encuestas' keeps the list's query string when it came from there", async () => {
    renderFull({ listSearch: "active=true&page=2&q=clima" });

    expect(await screen.findByRole("link", { name: "Encuestas" })).toHaveAttribute(
      "href",
      "/dashboard?active=true&page=2&q=clima",
    );
  });

  it("REQ-FE-021: without list state the back link goes to /dashboard", async () => {
    renderFull();

    expect(await screen.findByRole("link", { name: "Encuestas" })).toHaveAttribute("href", "/dashboard");
  });

  it("AC-FE-021-2 / AC-FE-025-2: delete asks through ConfirmationDialog and navigates to /dashboard on 204", async () => {
    renderDetails();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    const dialog = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    expect(within(dialog).getByText("Confirma tu acción")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("dashboard")).toBeInTheDocument();
  });
});

describe("SurveyDetailsPage tabs (REQ-FE-022, REQ-FE-020)", () => {
  it("AC-FE-022-1: answers and statistics are not requested until their tab is opened", async () => {
    const { requested, user } = renderFull();
    await screen.findByRole("heading", { level: 1, name: "Clima laboral" });
    await screen.findByText("¿Cómo te sientes?");

    expect(requested()).toEqual(["GET /api/v1/surveys/clima-laboral"]);

    await user.click(screen.getByRole("tab", { name: "Respuestas" }));
    await waitFor(() => expect(requested()).toContain("GET /api/v1/surveys/clima-laboral/answers"));
    expect(requested()).not.toContain("GET /api/v1/surveys/clima-laboral/stats");

    await user.click(screen.getByRole("tab", { name: "Estadísticas" }));
    await waitFor(() => expect(requested()).toContain("GET /api/v1/surveys/clima-laboral/stats"));
  });

  it("REQ-FE-022: underline tabs — active in ink with a teal underline over a rule line", async () => {
    renderFull();
    const list = await screen.findByRole("tablist");
    expect(list).toHaveClass("border-b", "border-rule");

    const active = screen.getByRole("tab", { name: "Detalles" });
    expect(active).toHaveAttribute("data-state", "active");
    expect(active).toHaveClass("text-ink-muted", "border-b-2", "data-[state=active]:border-teal", "data-[state=active]:text-ink", "font-semibold");
    expect(screen.getByRole("tab", { name: "Respuestas" })).toHaveAttribute("data-state", "inactive");
  });

  it("AC-FE-022-2: 'Detalles' shows the public link with copy/open buttons and every question", async () => {
    // user-event installs its own clipboard stub; read it back after the copy.
    const { user } = renderFull();
    const url = `${window.location.origin}/surveys/clima-laboral`;

    const link = await screen.findByText(url);
    expect(link.closest("p")).toHaveClass("figures", "border", "border-input-border");
    await user.click(screen.getByRole("button", { name: "Copiar enlace" }));
    expect(await navigator.clipboard.readText()).toBe(url);
    expect(screen.getByRole("link", { name: "Abrir enlace" })).toHaveAttribute("href", url);

    const panel = screen.getByRole("tabpanel");
    const items = within(panel).getAllByRole("listitem").filter((li) => li.parentElement?.tagName === "OL");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("1.");
    expect(within(items[0]!).getByText("¿Cómo te sientes?")).toBeInTheDocument();
    expect(within(items[0]!).getByText("Respuesta de texto")).toBeInTheDocument();
    expect(within(items[0]!).getByText("Obligatoria")).toBeInTheDocument();
    expect(within(items[1]!).getByText("Selección múltiple")).toBeInTheDocument();
    expect(within(items[1]!).queryByText("Obligatoria")).not.toBeInTheDocument();
    for (const option of ["Salario", "Horario", "Equipo"]) {
      expect(within(items[1]!).getByText(option)).toBeInTheDocument();
    }
  });

  it("AC-FE-020-1: no control edits the survey's name or questions", async () => {
    renderFull();
    await screen.findByText("¿Cómo te sientes?");

    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Editar/i })).not.toBeInTheDocument();
  });

  it("AC-FE-022-3 / AC-FE-025-2: 'Ver respuestas' opens a sheet with resolved responses and a confirmed delete", async () => {
    const { user, requested } = renderFull();
    await user.click(await screen.findByRole("tab", { name: "Respuestas" }));

    expect((await screen.findAllByText("a1b2c3d4")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("10.0.0.7").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(new Date(answer.createdAt).toLocaleString("es-CU")).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Ver respuestas" })[0]!);
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Bien, gracias")).toBeInTheDocument();
    // Option ids [1, 3] shown as their contents.
    expect(within(sheet).getByText("Salario, Equipo")).toBeInTheDocument();

    await user.click(within(sheet).getByRole("button", { name: "Eliminar respuesta" }));
    const confirm = await screen.findByText("Confirma tu acción");
    const dialog = confirm.closest('[role="dialog"], [role="alertdialog"]') as HTMLElement;
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(requested()).not.toContain(`DELETE /api/v1/surveys/clima-laboral/answers/${answer.id}`);
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(requested()).toContain(`DELETE /api/v1/surveys/clima-laboral/answers/${answer.id}`),
    );
  });

  it("AC-FE-022-4: 'Estadísticas' shows the summary line, the completion bar and the small multiples, no cards", async () => {
    const { user, container } = renderFull();
    await user.click(await screen.findByRole("tab", { name: "Estadísticas" }));

    expect(await screen.findByText(/1 respuesta · 1 completa · 0 incompletas · 2 preguntas/)).toBeInTheDocument();
    expect(container.querySelector('[data-slot="stacked-bar"]')).not.toBeNull();
    expect(screen.getByRole("region", { name: "Respuestas por pregunta" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot^="card"]')).toBeNull();
  });
});
