import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { describe, expect, it, vi } from "vitest";
import SurveyCreatePage from "@/pages/SurveyCreatePage";
import { mockFetch } from "./helpers";

describe("SurveyCreatePage invalidations (REQ-FE-017)", () => {
  it("AC-FE-017-5: creating a survey invalidates the list, the summary and the active-survey statistics", async () => {
    mockFetch({
      "POST /api/v1/surveys": {
        status: 201,
        body: {
          data: {
            id: "1",
            name: "Clima laboral",
            slug: "clima-laboral",
            questions: [],
            isActive: false,
            isLocked: false,
            createdAt: "2026-10-01T12:00:00.000Z",
            updatedAt: null,
            deletedAt: null,
            activatedAt: null,
          },
        },
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/dashboard/surveys/create"]}>
          <Routes>
            <Route path="/dashboard/surveys/create" element={<SurveyCreatePage />} />
            <Route path="/dashboard" element={<p>dashboard</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Nombre de la Encuesta/), "Clima laboral");
    await user.type(screen.getByLabelText(/Pregunta #1/), "¿Cómo te sientes?");
    await user.click(screen.getByRole("button", { name: "Crear encuesta" }));

    expect(await screen.findByText("dashboard")).toBeInTheDocument();
    await waitFor(() => {
      const keys = invalidate.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
      expect(keys).toEqual(
        expect.arrayContaining([
          JSON.stringify(["/api/v1/surveys"]),
          JSON.stringify(["/api/v1/stats/surveys"]),
          JSON.stringify(["/api/v1/stats/surveys/active"]),
        ]),
      );
    });
  });
});

// FRONTEND.md REQ-FE-019 (create survey form), BRAND.md REQ-BRAND-019 (forms).
function renderCreate(reply: { status: number; body?: unknown } = { status: 201, body: { data: {} } }) {
  const fetchMock = mockFetch({ "POST /api/v1/surveys": reply });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard/surveys/create"]}>
        <Routes>
          <Route path="/dashboard/surveys/create" element={<SurveyCreatePage />} />
          <Route path="/dashboard" element={<p>dashboard</p>} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  );
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
  const body = () => JSON.parse(String(posts()[0]![1]!.body));
  return { user: userEvent.setup(), posts, body, invalidate };
}

describe("SurveyCreatePage (REQ-FE-019, REQ-BRAND-019)", () => {
  it("REQ-FE-019: layout — back link, 'Nueva encuesta', numbered ruled questions, no cards", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <SurveyCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: "Volver a encuestas" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("heading", { level: 1, name: "Nueva encuesta" })).toHaveClass("text-h1");
    const list = container.querySelector("ol") as HTMLElement;
    expect(list).toHaveClass("border-y", "border-rule-strong");
    const first = list.querySelector(":scope > li") as HTMLElement;
    expect(first).toHaveClass("border-rule", "not-first:border-t");
    expect(within(first).getByText("1")).toHaveClass("figures");
    expect(within(first).getByRole("button", { name: "Eliminar pregunta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir pregunta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear encuesta" })).toHaveAttribute("type", "submit");
    expect(container.querySelector('[data-slot^="card"]')).toBeNull();
  });

  it("AC-BRAND-019-1: every field has a visible label associated with it", async () => {
    const { user } = renderCreate();
    await user.selectOptions(screen.getByLabelText("Tipo de Pregunta"), "SINGLE_SELECT");
    await user.click(screen.getByRole("button", { name: "Añadir opción" }));

    expect(screen.getByLabelText(/Nombre de la Encuesta/)).toHaveAttribute("id", "survey-name");
    expect(screen.getByLabelText(/Pregunta #1/)).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de Pregunta").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Pregunta obligatoria (requerida)")).toHaveRole("checkbox");
    expect(screen.getByLabelText("Opción 1")).toBeInTheDocument();
  });

  it("AC-FE-019-1 / AC-BRAND-019-2: names shorter than 5 characters show errors and send nothing", async () => {
    const { user, posts } = renderCreate();
    await user.type(screen.getByLabelText(/Nombre de la Encuesta/), "Clim");
    await user.type(screen.getByLabelText(/Pregunta #1/), "¿Qu");
    await user.click(screen.getByRole("button", { name: "Crear encuesta" }));

    const name = screen.getByLabelText(/Nombre de la Encuesta/);
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    const nameError = document.getElementById(name.getAttribute("aria-describedby")!)!;
    expect(nameError).toHaveTextContent("Debe tener al menos 5 caracteres");

    const question = screen.getByLabelText(/Pregunta #1/);
    expect(question).toHaveAttribute("aria-invalid", "true");
    const questionError = document.getElementById(question.getAttribute("aria-describedby")!)!;
    expect(questionError).toHaveTextContent("Debe tener al menos 5 caracteres");
    // Rust, with an icon (REQ-BRAND-019).
    expect(questionError.className).toMatch(/text-rust|text-destructive/);

    // Entered values are kept.
    expect(name).toHaveValue("Clim");
    expect(question).toHaveValue("¿Qu");
    expect(posts()).toHaveLength(0);
  });

  it("AC-FE-019-2: select questions can add and remove options; TEXT_ANSWER has none", async () => {
    const { user } = renderCreate();
    expect(screen.queryByRole("button", { name: "Añadir opción" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Tipo de Pregunta"), "MULTI_SELECT");
    await user.click(screen.getByRole("button", { name: "Añadir opción" }));
    await user.click(screen.getByRole("button", { name: "Añadir opción" }));
    expect(screen.getAllByRole("button", { name: "Eliminar opción" })).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Eliminar opción" })[0]!);
    expect(screen.getAllByRole("button", { name: "Eliminar opción" })).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText("Tipo de Pregunta"), "TEXT_ANSWER");
    expect(screen.queryByRole("button", { name: "Añadir opción" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Opción 1")).not.toBeInTheDocument();
  });

  it("AC-BRAND-019-4: an empty option blocks the submission and shows its error under that input", async () => {
    const { user, posts } = renderCreate();
    await user.type(screen.getByLabelText(/Nombre de la Encuesta/), "Clima laboral");
    await user.type(screen.getByLabelText(/Pregunta #1/), "¿Recomendarías la empresa?");
    await user.selectOptions(screen.getByLabelText("Tipo de Pregunta"), "SINGLE_SELECT");
    await user.click(screen.getByRole("button", { name: "Añadir opción" }));
    await user.type(screen.getByLabelText("Opción 1"), "Sí");
    await user.click(screen.getByRole("button", { name: "Añadir opción" }));
    await user.click(screen.getByRole("button", { name: "Crear encuesta" }));

    const empty = screen.getByLabelText("Opción 2");
    await waitFor(() => expect(empty).toHaveAttribute("aria-invalid", "true"));
    const error = document.getElementById(empty.getAttribute("aria-describedby")!)!;
    expect(error).toHaveTextContent("El contenido de la opción es obligatorio");
    // Under that option input: in the same option row, after the input.
    expect(error.closest("li")).toBe(empty.closest("li"));
    expect(empty.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText("Opción 1")).not.toHaveAttribute("aria-invalid");
    expect(posts()).toHaveLength(0);
  });

  it("AC-FE-019-3: question ids and, within each question, option ids are numbered from 1", async () => {
    const { user, body } = renderCreate();
    await user.type(screen.getByLabelText(/Nombre de la Encuesta/), "Clima laboral");
    await user.type(screen.getByLabelText(/Pregunta #1/), "¿Cómo te sientes?");
    await user.click(screen.getByRole("button", { name: "Añadir pregunta" }));
    await user.type(screen.getByLabelText(/Pregunta #2/), "¿Qué valoras más?");
    const [, secondType] = screen.getAllByLabelText("Tipo de Pregunta");
    await user.selectOptions(secondType!, "MULTI_SELECT");
    await user.click(screen.getByLabelText("Pregunta obligatoria (requerida)", { selector: "#q-1-required" }));
    for (const content of ["Salario", "Horario", "Equipo"]) {
      await user.click(screen.getByRole("button", { name: "Añadir opción" }));
      const inputs = screen.getAllByPlaceholderText(/^Opción \d$/);
      await user.type(inputs[inputs.length - 1]!, content);
    }
    await user.click(screen.getByRole("button", { name: "Crear encuesta" }));

    expect(await screen.findByText("dashboard")).toBeInTheDocument();
    expect(body()).toEqual({
      name: "Clima laboral",
      questions: [
        { id: 1, name: "¿Cómo te sientes?", type: "TEXT_ANSWER", isRequired: false },
        {
          id: 2,
          name: "¿Qué valoras más?",
          type: "MULTI_SELECT",
          isRequired: true,
          options: [
            { id: 1, content: "Salario" },
            { id: 2, content: "Horario" },
            { id: 3, content: "Equipo" },
          ],
        },
      ],
    });
  });

  it("AC-FE-019-4: on 201 the list is invalidated, a toast is shown and the app returns to /dashboard", async () => {
    const { user, invalidate } = renderCreate();
    await user.type(screen.getByLabelText(/Nombre de la Encuesta/), "Clima laboral");
    await user.type(screen.getByLabelText(/Pregunta #1/), "¿Cómo te sientes?");
    await user.click(screen.getByRole("button", { name: "Crear encuesta" }));

    expect(await screen.findByText("dashboard")).toBeInTheDocument();
    expect(await screen.findByText("Encuesta creada correctamente")).toBeInTheDocument();
    const keys = invalidate.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys).toContain(JSON.stringify(["/api/v1/surveys"]));
  });

  it("AC-BRAND-019-2: an API error is toasted with its detail and the entered values are kept", async () => {
    const { user } = renderCreate({
      status: 400,
      body: { status: 400, title: "Bad Request", detail: "El nombre ya existe" },
    });
    await user.type(screen.getByLabelText(/Nombre de la Encuesta/), "Clima laboral");
    await user.type(screen.getByLabelText(/Pregunta #1/), "¿Cómo te sientes?");
    await user.click(screen.getByRole("button", { name: "Crear encuesta" }));

    expect(await screen.findByText("El nombre ya existe")).toBeInTheDocument();
    expect(screen.queryByText("dashboard")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de la Encuesta/)).toHaveValue("Clima laboral");
    expect(screen.getByLabelText(/Pregunta #1/)).toHaveValue("¿Cómo te sientes?");
  });

  it("AC-BRAND-019-3: fields and buttons are reachable with the keyboard", async () => {
    const { user } = renderCreate();
    const order: string[] = [];
    for (let i = 0; i < 8; i++) {
      await user.tab();
      const el = document.activeElement as HTMLElement;
      order.push(el.getAttribute("aria-label") ?? el.id ?? el.textContent ?? "");
    }
    expect(order).toEqual(
      expect.arrayContaining([
        "survey-name",
        "q-0-name",
        "Eliminar pregunta",
        "q-0-type",
        "q-0-required",
      ]),
    );
  });
});
