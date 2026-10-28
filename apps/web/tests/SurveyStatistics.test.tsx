import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SurveyStatistics from "@/components/SurveyStatistics";
import type { Survey, SurveyStats } from "@/lib/api/sondixAPI.schemas";
import { mockFetch, renderWithProviders } from "./helpers";

// FRONTEND.md REQ-FE-033 (statistics tab), REQ-FE-022 (AC-FE-022-4),
// BRAND.md REQ-BRAND-027 / 028, STATS.md REQ-STAT-002 / 004 (the data).

// Percentages are written with no space before "%" (REQ-BRAND-028, DEV-004).
const pct = (n: number) => new RegExp(`(^|[^0-9])${n}%`);
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const base = {
  id: "1",
  name: "Clima laboral",
  slug: "clima-laboral",
  isActive: true,
  isLocked: true,
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: null,
  deletedAt: null,
  activatedAt: "2026-10-02T12:00:00.000Z",
};

// 5 questions: 2 text, 1 single select, 1 multi select, 1 single select.
const survey = {
  ...base,
  questions: [
    { id: 1, name: "¿Cómo te sientes?", type: "TEXT_ANSWER", isRequired: false },
    {
      id: 2,
      name: "¿Recomendarías la empresa?",
      type: "SINGLE_SELECT",
      isRequired: true,
      options: [
        { id: 1, content: "Sí" },
        { id: 2, content: "No" },
      ],
    },
    {
      id: 3,
      name: "¿Qué valoras más?",
      type: "MULTI_SELECT",
      isRequired: false,
      options: [
        { id: 1, content: "Salario" },
        { id: 2, content: "Horario" },
        { id: 3, content: "Equipo" },
      ],
    },
    { id: 4, name: "¿Algo más que añadir?", type: "TEXT_ANSWER", isRequired: false },
    {
      id: 5,
      name: "¿Turno preferido?",
      type: "SINGLE_SELECT",
      isRequired: false,
      options: [
        { id: 1, content: "Mañana" },
        { id: 2, content: "Mañana" },
      ],
    },
  ],
} as Survey;

const stats: SurveyStats = {
  totalAnswers: 83,
  completedAnswers: 71,
  incompleteAnswers: 12,
  questionCount: 5,
  optionStats: [
    {
      questionId: 2,
      questionName: "¿Recomendarías la empresa?",
      options: [
        { optionContent: "Sí", responseCount: 50 },
        { optionContent: "No", responseCount: 33 },
      ],
    },
    {
      questionId: 3,
      questionName: "¿Qué valoras más?",
      options: [
        { optionContent: "Salario", responseCount: 60 },
        { optionContent: "Horario", responseCount: 0 },
        { optionContent: "Equipo", responseCount: 41 },
      ],
    },
    {
      questionId: 5,
      questionName: "¿Turno preferido?",
      options: [
        { optionContent: "Mañana", responseCount: 40 },
        { optionContent: "Mañana", responseCount: 43 },
      ],
    },
  ],
};

function renderStats(s: Survey, body: SurveyStats) {
  const fetchMock = mockFetch({
    "GET /api/v1/surveys/clima-laboral/stats": { status: 200, body: { data: body } },
  });
  const view = renderWithProviders(<SurveyStatistics survey={s} />);
  return { fetchMock, ...view };
}

const cellOf = (title: string) =>
  screen.getByRole("heading", { name: title }).closest("li") as HTMLElement;
const fillWidth = (bar: Element) =>
  (bar.querySelector(':scope > [aria-hidden="true"] > span') as HTMLElement | null)?.style.width;

describe("SurveyStatistics (REQ-FE-033)", () => {
  it("AC-FE-033-1: summary line, completion bar 71/83 teal and 12/83 rust, with labels", async () => {
    const { container } = renderStats(survey, stats);

    const summary = await screen.findByText(/83 respuestas · 71 completas/);
    expect(text(summary)).toBe("83 respuestas · 71 completas · 12 incompletas · 5 preguntas");

    const stacked = container.querySelector('[data-slot="stacked-bar"]') as HTMLElement;
    expect(stacked).toHaveAttribute("aria-hidden", "true");
    const segments = Array.from(stacked.children) as HTMLElement[];
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveClass("bg-teal");
    expect(parseFloat(segments[0]!.style.width)).toBeCloseTo((71 / 83) * 100, 5);
    expect(segments[1]).toHaveClass("bg-rust");
    expect(parseFloat(segments[1]!.style.width)).toBeCloseTo((12 / 83) * 100, 5);
    // 8 px tall, square ends (REQ-BRAND-028).
    expect(stacked).toHaveClass("h-2");
    expect(stacked.className).not.toMatch(/rounded/);

    const labels = text(stacked.nextElementSibling);
    expect(labels).toContain("Completas 71 (86%)");
    expect(labels).toContain("Incompletas 12 (14%)");
  });

  it("AC-FE-033-1: singulars when a count is 1", async () => {
    const one = {
      ...survey,
      questions: [survey.questions[1]!],
    } as Survey;
    renderStats(one, {
      totalAnswers: 1,
      completedAnswers: 1,
      incompleteAnswers: 0,
      questionCount: 1,
      optionStats: [stats.optionStats[0]!],
    });

    const summary = await screen.findByText(/1 respuesta ·/);
    expect(text(summary)).toBe("1 respuesta · 1 completa · 0 incompletas · 1 pregunta");
  });

  it("AC-FE-033-2: one teal bar per option on the common 0–totalAnswers scale, valued '{n} · {p}'", async () => {
    renderStats(survey, stats);
    await screen.findByRole("region", { name: "Respuestas por pregunta" });

    const single = cellOf("2. ¿Recomendarías la empresa?");
    const bars = single.querySelectorAll('[data-slot="bar"]');
    expect(bars).toHaveLength(2);
    expect(parseFloat(fillWidth(bars[0]!)!)).toBeCloseTo((50 / 83) * 100, 5);
    expect(parseFloat(fillWidth(bars[1]!)!)).toBeCloseTo((33 / 83) * 100, 5);
    expect(text(bars[0]!)).toMatch(/^Sí\s*50 · 60%$/);
    expect(text(bars[1]!)).toMatch(/^No\s*33 · 40%$/);
    for (const bar of bars) {
      expect(bar.querySelector(':scope > [aria-hidden="true"] > span')).toHaveClass("bg-teal");
    }

    // Same scale in every cell: 60/83 in the multi-select cell.
    const multi = cellOf("3. ¿Qué valoras más?");
    const multiBars = multi.querySelectorAll('[data-slot="bar"]');
    expect(parseFloat(fillWidth(multiBars[0]!)!)).toBeCloseTo((60 / 83) * 100, 5);
    // A 0 keeps its track and its "0" (AC-BRAND-028-2).
    expect(fillWidth(multiBars[1]!)).toBeUndefined();
    expect(text(multiBars[1]!)).toMatch(/0 · 0%$/);

    expect(screen.getByText(/Escala común: 0–83 respuestas/)).toBeInTheDocument();
    expect(text(screen.getByText(/Escala común: 0–83 respuestas/))).toBe(
      "Escala común: 0–83 respuestas (100%)",
    );
  });

  it("AC-FE-033-2: cells in optionStats order, numbered by question, with the type caption", async () => {
    renderStats(survey, stats);
    const row = await screen.findByRole("region", { name: "Respuestas por pregunta" });

    const items = within(row).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual([
      "2. ¿Recomendarías la empresa?",
      "3. ¿Qué valoras más?",
      "5. ¿Turno preferido?",
    ]);
    expect(within(items[0]!).getByText("Selección única")).toBeInTheDocument();
    expect(within(items[1]!).getByText("Selección múltiple")).toBeInTheDocument();
    // Options with the same text are shown apart (REQ-STAT-004).
    expect(within(items[2]!).getAllByText("Mañana")).toHaveLength(2);
  });

  it("AC-BRAND-027-1 / 027-3: the statistics row uses 3 / 2 / 1 cells per line and is a section with a list", async () => {
    renderStats(survey, stats);
    const row = await screen.findByRole("region", { name: "Respuestas por pregunta" });

    const list = row.querySelector("ul") as HTMLElement;
    expect(list).toHaveClass("grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3", "border-y", "border-rule-strong");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("AC-FE-033-3: with a MULTI_SELECT question the caption notes that percentages may exceed 100%", async () => {
    renderStats(survey, stats);
    await screen.findByRole("region", { name: "Respuestas por pregunta" });

    expect(screen.getByText(/En selección múltiple los porcentajes pueden sumar más de/)).toBeInTheDocument();
    const caption = screen.getByText(/Escala común/).parentElement;
    expect(text(caption)).toContain("En selección múltiple los porcentajes pueden sumar más de 100%");
  });

  it("AC-FE-033-3: without a MULTI_SELECT question there is no such note", async () => {
    const singleOnly = {
      ...survey,
      questions: survey.questions.filter((q) => q.type !== "MULTI_SELECT"),
    } as Survey;
    renderStats(singleOnly, {
      ...stats,
      questionCount: 4,
      optionStats: stats.optionStats.filter((q) => q.questionId !== 3),
    });
    await screen.findByRole("region", { name: "Respuestas por pregunta" });

    expect(screen.queryByText(/En selección múltiple/)).not.toBeInTheDocument();
  });

  it("AC-FE-033-4: 2 TEXT_ANSWER questions have no cell and a closing line", async () => {
    renderStats(survey, stats);
    const row = await screen.findByRole("region", { name: "Respuestas por pregunta" });

    expect(within(row).queryByText(/¿Cómo te sientes\?/)).not.toBeInTheDocument();
    expect(within(row).queryByText(/¿Algo más que añadir\?/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "2 preguntas de texto libre: consulta sus respuestas en la pestaña Respuestas.",
      ),
    ).toBeInTheDocument();
  });

  it("AC-FE-033-4: singular closing line for 1 text question", async () => {
    const oneText = {
      ...survey,
      questions: survey.questions.filter((q) => q.id !== 4),
    } as Survey;
    renderStats(oneText, { ...stats, questionCount: 4 });
    await screen.findByRole("region", { name: "Respuestas por pregunta" });

    expect(
      screen.getByText(
        "1 pregunta de texto libre: consulta sus respuestas en la pestaña Respuestas.",
      ),
    ).toBeInTheDocument();
  });

  it("AC-FE-033-5: with totalAnswers = 0 it shows only the empty line", async () => {
    const { container } = renderStats(survey, {
      totalAnswers: 0,
      completedAnswers: 0,
      incompleteAnswers: 0,
      questionCount: 5,
      optionStats: stats.optionStats.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o, responseCount: 0 })),
      })),
    });

    expect(await screen.findByText("Todavía no hay respuestas para esta encuesta.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Respuestas por pregunta" })).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="stacked-bar"]')).toBeNull();
    expect(screen.queryByText(/respuestas ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/texto libre/)).not.toBeInTheDocument();
  });

  it("REQ-FE-033 (REQ-BRAND-033): on error it shows the error line with 'Reintentar'", async () => {
    mockFetch({
      "GET /api/v1/surveys/clima-laboral/stats": {
        status: 500,
        body: { status: 500, title: "Internal Server Error", detail: "boom" },
      },
    });
    renderWithProviders(<SurveyStatistics survey={survey} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("button", { name: /Reintentar/ })).toBeInTheDocument();
  });

  it("AC-FE-022-4: the tab has no cards", async () => {
    const { container } = renderStats(survey, stats);
    await screen.findByRole("region", { name: "Respuestas por pregunta" });

    expect(container.querySelector('[data-slot^="card"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/shadow|rounded-(md|lg|xl)/);
    // Every number is text, and no percentage has a space (regular or
    // non-breaking) before "%" (REQ-BRAND-028).
    expect(screen.getByText(pct(60))).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[0-9][ \u00a0]+%/);
  });
});
