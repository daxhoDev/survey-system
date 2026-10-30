import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import SurveyAnsweringPage from "@/pages/SurveyAnsweringPage";
import { mockFetch, renderWithProviders } from "./helpers";

const survey = {
  id: "1",
  name: "Employee Satisfaction Survey",
  slug: "employee-survey",
  isActive: true,
  questions: [
    {
      id: 1,
      name: "Are you happy at our company?",
      type: "SINGLE_SELECT",
      options: [
        { id: 1, content: "Yes" },
        { id: 2, content: "No" },
      ],
      isRequired: true,
    },
    {
      id: 2,
      name: "Which benefits do you use?",
      type: "MULTI_SELECT",
      options: [
        { id: 1, content: "Gym" },
        { id: 2, content: "Lunch" },
      ],
      isRequired: false,
    },
    { id: 3, name: "Anything else to tell us?", type: "TEXT_ANSWER", isRequired: false },
  ],
};

// 5 questions, 2 of them required (AC-FE-034-1, AC-FE-034-3).
const fiveQuestions = {
  ...survey,
  questions: [
    ...survey.questions,
    { id: 4, name: "What should we improve?", type: "TEXT_ANSWER", isRequired: true },
    {
      id: 5,
      name: "How did you hear about us?",
      type: "SINGLE_SELECT",
      options: [
        { id: 3, content: "Friend" },
        { id: 4, content: "Web" },
      ],
      isRequired: false,
    },
  ],
};

const getSurvey = "GET /api/v1/surveys/employee-survey";
const postAnswer = "POST /api/v1/surveys/employee-survey/answers";
const getAnswered = "GET /api/v1/surveys/employee-survey/answered";

// The answered-status check of REQ-FE-035, answering "not answered yet".
const notAnswered = {
  [getAnswered]: { status: 200, body: { data: { answered: false } } },
};

function renderPage() {
  return renderWithProviders(<SurveyAnsweringPage />, {
    path: "/surveys/:slug",
    route: "/surveys/employee-survey",
  });
}

const notFound = {
  status: 404,
  body: { status: 404, title: "Not found", detail: "The requested survey doesn't exist" },
};

const posted = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter((c) => c[1]?.method === "POST");

describe("SurveyAnsweringPage (REQ-FE-023, REQ-FE-024, REQ-FE-034)", () => {
  it("AC-FE-024-1: shows 'Encuesta no encontrada — no existe o no está disponible' when the survey is missing or inactive", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: notFound });
    const { container } = renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Encuesta no encontrada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "La encuesta que estás intentando acceder no existe o no está disponible.",
      ),
    ).toBeInTheDocument();
    // Same frame: footer logo, no form.
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector('footer [data-slot="logo"]')).not.toBeNull();
  });

  it("REQ-FE-034 loading: the frame shows skeleton rules while the survey loads", async () => {
    mockFetch({
      ...notAnswered,
      [getSurvey]: () => {
        // never resolves within the assertion
        return { status: 200, body: { data: survey } };
      },
    });
    const { container } = renderPage();

    expect(screen.getByRole("status", { name: "Cargando encuesta..." })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(container.querySelector('footer [data-slot="logo"]')).not.toBeNull();
    await screen.findByText(survey.name);
  });

  it("AC-FE-023-1: a textarea, a radio group and checkboxes respectively, required questions marked with *", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    renderPage();

    expect(await screen.findByText(survey.name)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("placeholder", "Escribe tu respuesta aquí...");
    expect(textarea).toHaveAttribute("rows", "4");
    expect(textarea).toHaveClass("text-body-lg");
    expect(screen.getAllByText("*")).toHaveLength(1);
  });

  it("AC-FE-034-1: name, count line, 2 px rule and numbered fieldsets in one column at most 42 rem, no card or band", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: fiveQuestions } } });
    const { container } = renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: fiveQuestions.name }),
    ).toBeInTheDocument();
    const header = container.querySelector("header")!;
    expect(
      within(header).getByText("5 preguntas · Las marcadas con * son obligatorias."),
    ).toHaveClass("text-small", "text-ink-muted");
    expect(header.querySelector("hr")).toHaveClass("border-t-2", "border-rule-strong");

    const fieldsets = container.querySelectorAll("fieldset");
    expect(fieldsets).toHaveLength(5);
    fieldsets.forEach((fs, i) => {
      const number = fs.querySelector("legend > span")!;
      expect(number).toHaveTextContent(String(i + 1));
      expect(number).toHaveClass("figures", "text-ink-muted");
      expect(fs.querySelector("legend")).toHaveClass("text-h3");
    });
    // Separated by 1 px rules and 32 px of space.
    const list = fieldsets[0]!.parentElement!.parentElement!;
    expect(list).toHaveClass("divide-y", "divide-rule");
    expect(fieldsets[0]!.parentElement).toHaveClass("py-8");

    // One column, at most 42 rem (max-w-168 = 168 × 0.25 rem), on paper.
    const column = container.querySelector("main")!.parentElement!;
    expect(column).toHaveClass("max-w-168", "w-full");
    expect(column.parentElement).toHaveClass("bg-paper", "justify-center");
    // No top bar, card or header band.
    expect(container.querySelector('[data-slot^="card"]')).toBeNull();
    expect(container.querySelector("nav")).toBeNull();
    expect(container.querySelector('[class*="bg-teal-tint"]:not(label)')).toBeNull();
  });

  it("REQ-FE-034: from lg the question numbers hang in the left gutter", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    const { container } = renderPage();
    await screen.findByText(survey.name);

    const number = container.querySelector("fieldset legend > span")!;
    expect(number).toHaveClass("lg:absolute");
    expect(number.className).toMatch(/lg:-left-/);
    expect(container.querySelector("fieldset")).toHaveClass("relative");
  });

  it("AC-FE-034-1: long unbroken question and option text wraps instead of scrolling sideways", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    renderPage();
    await screen.findByText(survey.name);

    expect(screen.getByText("Are you happy at our company?")).toHaveClass("min-w-0", "wrap-anywhere");
    for (const option of ["Yes", "Gym"]) {
      expect(screen.getByText(option)).toHaveClass("min-w-0", "wrap-anywhere");
    }
  });

  it("AC-FE-034-2: a click anywhere in an option row toggles it, and the row is at least 44 px tall", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    renderPage();
    const user = userEvent.setup();
    await screen.findByText(survey.name);

    const noRow = screen.getByText("No").closest("label")!;
    expect(noRow).toHaveClass("min-h-11", "w-full", "hover:bg-surface-subtle");
    expect(noRow.className).toContain("has-data-[state=checked]:bg-teal-tint");
    // Click on the row (label), not on the control itself.
    await user.click(noRow);
    expect(screen.getByRole("radio", { name: "No" })).toHaveAttribute("data-state", "checked");

    const gymRow = screen.getByText("Gym").closest("label")!;
    expect(gymRow).toHaveClass("min-h-11", "w-full");
    await user.click(gymRow);
    const gym = screen.getByRole("checkbox", { name: "Gym" });
    expect(gym).toHaveAttribute("data-state", "checked");
    await user.click(gymRow);
    expect(gym).toHaveAttribute("data-state", "unchecked");
  });

  it("REQ-FE-034 / REQ-BRAND-019: a checked radio or checkbox is filled in teal", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    renderPage();
    const user = userEvent.setup();
    await screen.findByText(survey.name);

    await user.click(screen.getByText("Yes"));
    await user.click(screen.getByText("Lunch"));
    for (const control of [
      screen.getByRole("radio", { name: "Yes" }),
      screen.getByRole("checkbox", { name: "Lunch" }),
    ]) {
      expect(control).toHaveAttribute("data-state", "checked");
      expect(control.className).toContain("data-[state=checked]:bg-teal");
      expect(control).toHaveClass("border-input-border");
    }
  });

  it("AC-FE-023-2: an empty required question shows the error under it, focus moves to it and no request is sent", async () => {
    const fetchMock = mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: fiveQuestions } } });
    const { container } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Enviar respuestas" }));

    const errors = await screen.findAllByText("Esta pregunta es obligatoria");
    expect(errors).toHaveLength(2);
    const fieldsets = container.querySelectorAll("fieldset");
    expect(fieldsets[0]).toContainElement(errors[0]!);
    expect(fieldsets[3]).toContainElement(errors[1]!);
    // Focus on the first control of the first unanswered required question.
    expect(screen.getAllByRole("radio")[0]).toHaveFocus();
    expect(posted(fetchMock)).toHaveLength(0);
  });

  it("AC-FE-023-2: focus goes to the textarea when it is the first unanswered required question", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: fiveQuestions } } });
    renderPage();
    const user = userEvent.setup();
    await screen.findByText(fiveQuestions.name);

    await user.click(screen.getByText("Yes"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    expect(await screen.findAllByText("Esta pregunta es obligatoria")).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: /What should we improve/ })).toHaveFocus();
  });

  it("REQ-FE-034 errors / AC-BRAND-019-2: rust with an icon, fieldset aria-invalid and aria-describedby to the message", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    const { container } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Enviar respuestas" }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Esta pregunta es obligatoria");
    expect(error).toHaveClass("text-rust");
    expect(error.querySelector("svg")).not.toBeNull();
    const fieldset = container.querySelector("fieldset")!;
    expect(fieldset).toHaveAttribute("aria-invalid", "true");
    expect(fieldset).toHaveAttribute("aria-describedby", error.id);
    // The other (optional) fieldsets are not invalid.
    expect(container.querySelectorAll('fieldset[aria-invalid="true"]')).toHaveLength(1);

    // Answering it clears the error on the next submit attempt (values are kept).
    await user.click(screen.getByText("Yes"));
    expect(screen.getByRole("radio", { name: "Yes" })).toHaveAttribute("data-state", "checked");
  });

  it("AC-FE-034-4: the required legend includes '(obligatoria)' and the asterisk is hidden from the accessibility tree", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    renderPage();
    await screen.findByText(survey.name);

    const required = screen.getByRole("group", {
      name: "1 Are you happy at our company? (obligatoria)",
    });
    expect(required.tagName).toBe("FIELDSET");
    const asterisk = within(required).getByText("*");
    expect(asterisk).toHaveAttribute("aria-hidden", "true");
    expect(within(required).getByText("(obligatoria)")).toHaveClass("sr-only");
    // The radio group is labelled by the legend, too.
    expect(screen.getByRole("radiogroup")).toHaveAccessibleName(
      "1 Are you happy at our company? (obligatoria)",
    );
    // Optional questions carry no mark.
    expect(screen.getByRole("group", { name: "2 Which benefits do you use?" })).toBeInTheDocument();
  });

  it("AC-FE-023-3: a SINGLE_SELECT choice of option 2 sends [2] and the empty optional question is omitted", async () => {
    const fetchMock = mockFetch({
      ...notAnswered,
      [getSurvey]: { status: 200, body: { data: survey } },
      [postAnswer]: { status: 201, body: { data: { id: "a1" } } },
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("No"));
    await user.click(screen.getByLabelText("Lunch"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    await screen.findByText("¡Muchas gracias!");
    const [post] = posted(fetchMock);
    expect(JSON.parse(String(post![1]!.body))).toEqual({
      responses: [
        { id: 1, content: [2] },
        { id: 2, content: [2] },
      ],
    });
  });

  it("AC-FE-023-3: a checkbox checked then unchecked, and blank text, are omitted", async () => {
    const fetchMock = mockFetch({
      ...notAnswered,
      [getSurvey]: { status: 200, body: { data: survey } },
      [postAnswer]: { status: 201, body: { data: { id: "a1" } } },
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("Yes"));
    await user.click(screen.getByLabelText("Gym"));
    await user.click(screen.getByLabelText("Gym"));
    await user.type(screen.getByRole("textbox"), "hi");
    await user.clear(screen.getByRole("textbox"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    await screen.findByText("¡Muchas gracias!");
    const [post] = posted(fetchMock);
    expect(JSON.parse(String(post![1]!.body))).toEqual({
      responses: [{ id: 1, content: [1] }],
    });
  });

  it("AC-FE-023-4 / AC-FE-034-5: on 201 the thank-you state replaces the form and focus is on '¡Muchas gracias!'", async () => {
    mockFetch({
      ...notAnswered,
      [getSurvey]: { status: 200, body: { data: survey } },
      [postAnswer]: { status: 201, body: { data: { id: "a1" } } },
    });
    const { container } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    const heading = await screen.findByRole("heading", { name: "¡Muchas gracias!" });
    expect(heading).toHaveClass("text-h2");
    await waitFor(() => expect(heading).toHaveFocus());
    expect(
      screen.getByText(
        `Tus respuestas a la encuesta ${survey.name} han sido enviadas correctamente.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(survey.name)).toBeInTheDocument();
    expect(container.querySelector("main hr")).toHaveClass("border-t-2", "border-rule-strong");
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("AC-FE-023-5: an API error other than 403 shows its detail in a toast and keeps the entered values", async () => {
    mockFetch({
      ...notAnswered,
      [getSurvey]: { status: 200, body: { data: survey } },
      [postAnswer]: {
        status: 400,
        body: { status: 400, title: "Bad request", detail: "Invalid responses" },
      },
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("No"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    expect(await screen.findByText("Invalid responses")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "No" })).toHaveAttribute("data-state", "checked");
    expect(screen.queryByText("¡Muchas gracias!")).toBeNull();
  });

  it("AC-FE-024-2: a submission rejected with 404 shows the API detail in a toast", async () => {
    mockFetch({
      ...notAnswered,
      [getSurvey]: { status: 200, body: { data: survey } },
      [postAnswer]: {
        status: 404,
        body: {
          status: 404,
          title: "Not found",
          detail: "The survey you are trying to answer doesn't exist",
        },
      },
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    await waitFor(() =>
      expect(
        screen.getByText("The survey you are trying to answer doesn't exist"),
      ).toBeInTheDocument(),
    );
  });

  it("REQ-FE-034 submit: 'Enviar respuestas' shows 'Enviando...' while the request is pending, full width below md", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    const base = globalThis.fetch;
    const fetchSpy = async (input: string, init: RequestInit = {}) => {
      if (init.method === "POST") {
        await gate;
        return new Response(JSON.stringify({ data: { id: "a1" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return base(input, init);
    };
    globalThis.fetch = fetchSpy as typeof fetch;
    renderPage();
    const user = userEvent.setup();

    const button = await screen.findByRole("button", { name: "Enviar respuestas" });
    expect(button).toHaveClass("w-full", "md:w-auto");
    await user.click(screen.getByLabelText("Yes"));
    await user.click(button);

    const pending = await screen.findByRole("button", { name: /Enviando\.\.\./ });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");
    release();
    expect(await screen.findByText("¡Muchas gracias!")).toBeInTheDocument();
  });

  it("AC-FE-034-3: '{answered} de {n} respondidas' counts non-empty answers; sticky with a teal bar below md, not sticky next to submit from md", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: fiveQuestions } } });
    const { container } = renderPage();
    const user = userEvent.setup();
    await screen.findByText(fiveQuestions.name);

    expect(screen.getAllByText("0 de 5 respondidas")).toHaveLength(2);
    await user.click(screen.getByText("Yes"));
    await user.type(screen.getByRole("textbox", { name: /What should we improve/ }), "x");
    const lines = screen.getAllByText("2 de 5 respondidas");
    expect(lines).toHaveLength(2);

    const [mobile, desktop] = lines.map((l) => l.parentElement!);
    expect(mobile).toHaveClass("sticky", "top-0", "bg-paper", "border-b", "border-rule", "md:hidden");
    expect(desktop).toHaveClass("hidden", "md:flex");
    expect(desktop).not.toHaveClass("sticky");
    // Desktop copy sits next to the submit button.
    expect(desktop.parentElement).toContainElement(
      screen.getByRole("button", { name: "Enviar respuestas" }),
    );
    // 2 px teal bar on a rule track at 40 %.
    const track = mobile.querySelector('[aria-hidden="true"]')!;
    expect(track).toHaveClass("h-0.5", "bg-rule");
    const bar = track.firstElementChild as HTMLElement;
    expect(bar).toHaveClass("bg-teal");
    expect(bar.style.width).toBe("40%");

    // Clearing an answer lowers the count.
    await user.clear(screen.getByRole("textbox", { name: /What should we improve/ }));
    expect(screen.getAllByText("1 de 5 respondidas")).toHaveLength(2);
    expect(container.querySelector("form")).toContainElement(mobile);
  });

  it("AC-FE-034-6 / AC-FE-029-2 / AC-BRAND-021-4: the logo is shown once, in the footer, as the footer variant (16 px muted isotype, 16 px ink-muted wordmark, no teal), and no other Sondix text", async () => {
    mockFetch({ ...notAnswered, [getSurvey]: { status: 200, body: { data: survey } } });
    const { container } = renderPage();
    await screen.findByText(survey.name);

    const logos = container.querySelectorAll('[data-slot="logo"]');
    expect(logos).toHaveLength(1);
    const logo = logos[0]!;
    expect(logo.closest("footer")).not.toBeNull();
    expect(logo).toHaveAttribute("data-variant", "footer");
    expect(logo.querySelector("svg")).toHaveClass("size-[16px]");
    expect(logo.outerHTML).not.toMatch(/teal/);
    const wordmarks = screen.getAllByText(/Sondix/);
    expect(wordmarks).toHaveLength(1);
    expect(wordmarks[0]!.closest('[data-slot="logo"]')).toBe(logo);
    expect(wordmarks[0]).toHaveClass("font-sans", "font-bold", "text-[16px]", "text-ink-muted");
  });
});

// Same retry rule as the app's QueryClient (App.tsx, REQ-FE-010), with no
// delay between attempts so the retries do not slow the tests down.
function renderWithAppRetries() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error: { status?: number }) => {
          if (error?.status === 401 || error?.status === 403) return false;
          return failureCount < 3;
        },
        retryDelay: 0,
      },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/surveys/employee-survey"]}>
        <Routes>
          <Route path="/surveys/:slug" element={<SurveyAnsweringPage />} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  );
}

const answeredTrue = { status: 200, body: { data: { answered: true } } };
const answeredFalse = { status: 200, body: { data: { answered: false } } };
const serverError = {
  status: 500,
  body: { status: 500, title: "Internal error", detail: "Boom" },
};
const tooMany = {
  status: 429,
  body: { status: 429, title: "Too many requests", detail: "Slow down" },
};
const alreadyAnswered = {
  status: 403,
  body: {
    status: 403,
    title: "Forbidden",
    detail: "Your IP already submitted an answer for this survey",
  },
};

const calls = (fetchMock: ReturnType<typeof mockFetch>, key: string) =>
  fetchMock.mock.calls.filter((c) => {
    const path = new URL(String(c[0]), "http://localhost").pathname;
    return `${c[1]?.method ?? "GET"} ${path}` === key;
  });

const CHECK_ERROR = "No se pudo comprobar si tu IP ya ha respondido a esta encuesta.";

// Gated reply: the request stays pending until `release` is called.
function gated(reply: { status: number; body?: unknown }) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  return {
    release: () => act(() => release()),
    respond: async () => {
      await gate;
      return new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}

describe("SurveyAnsweringPage answered-IP guard (REQ-FE-035, REQ-FE-023, REQ-FE-024)", () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
  });

  it("AC-FE-035-1: both requests are sent without one waiting for the other, and the skeleton stays until both settle", async () => {
    const surveyReply = gated({ status: 200, body: { data: survey } });
    const checkReply = gated(answeredFalse);
    const fetchMock = mockFetch({});
    fetchMock.mockImplementation(async (input: string, init: RequestInit = {}) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (`${init.method ?? "GET"} ${path}` === getSurvey) return surveyReply.respond();
      if (`${init.method ?? "GET"} ${path}` === getAnswered) return checkReply.respond();
      throw new Error(`Unexpected request: ${path}`);
    });
    renderPage();

    // Both requests are in flight while neither has answered.
    await waitFor(() => {
      expect(calls(fetchMock, getSurvey)).toHaveLength(1);
      expect(calls(fetchMock, getAnswered)).toHaveLength(1);
    });
    expect(screen.getByRole("status", { name: "Cargando encuesta..." })).toBeInTheDocument();

    // The survey settles first: still the skeleton, no form.
    surveyReply.release();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByRole("status", { name: "Cargando encuesta..." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar respuestas" })).toBeNull();

    checkReply.release();
    expect(await screen.findByRole("button", { name: "Enviar respuestas" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Cargando encuesta..." })).toBeNull();
  });

  it("AC-FE-035-2: answered: true shows only the name, the 2 px rule and the focused h1, plus the footer logo", async () => {
    mockFetch({
      [getSurvey]: { status: 200, body: { data: survey } },
      [getAnswered]: answeredTrue,
    });
    const { container } = renderPage();

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Tu IP ya ha respondido a esta encuesta",
    });
    expect(heading).toHaveClass("text-h2");
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const name = screen.getByText(survey.name);
    expect(name.tagName).toBe("P");
    expect(name).toHaveClass("text-h1");
    expect(container.querySelector("main hr")).toHaveClass("border-t-2", "border-rule-strong");
    expect(container.querySelector('footer [data-slot="logo"]')).not.toBeNull();
    // Nothing else.
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("fieldset")).toBeNull();
    expect(screen.queryByText(/respondidas/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelectorAll("main p")).toHaveLength(1);
  });

  it("AC-FE-035-3: answered: false shows the form", async () => {
    mockFetch({
      [getSurvey]: { status: 200, body: { data: survey } },
      [getAnswered]: answeredFalse,
    });
    const { container } = renderPage();

    expect(await screen.findByRole("button", { name: "Enviar respuestas" })).toBeInTheDocument();
    expect(container.querySelectorAll("fieldset")).toHaveLength(3);
    expect(screen.queryByText("Tu IP ya ha respondido a esta encuesta")).toBeNull();
  });

  for (const [label, reply] of [
    ["a 5xx", serverError],
    ["a 429", tooMany],
  ] as const) {
    it(`AC-FE-035-4 / AC-FE-010-1: when every attempt fails with ${label}, after 3 retries the check-error state is shown and no form`, async () => {
      const fetchMock = mockFetch({
        [getSurvey]: { status: 200, body: { data: survey } },
        [getAnswered]: reply,
      });
      const { container } = renderWithAppRetries();

      const alert = await screen.findByRole("alert");
      expect(calls(fetchMock, getAnswered)).toHaveLength(4);
      expect(alert).toHaveTextContent(CHECK_ERROR);
      const line = within(alert).getByText(CHECK_ERROR);
      expect(line).toHaveClass("text-rust");
      expect(line.querySelector("svg")).not.toBeNull();
      expect(within(alert).getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
      const name = screen.getByText(survey.name);
      expect(name.tagName).toBe("P");
      expect(name).toHaveClass("text-h1");
      expect(container.querySelector("main hr")).toHaveClass("border-t-2", "border-rule-strong");
      expect(container.querySelector("form")).toBeNull();
      expect(container.querySelector('footer [data-slot="logo"]')).not.toBeNull();
    });
  }

  it("AC-FE-035-4: a network error on every attempt shows the check-error state", async () => {
    const fetchMock = mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input: string, init: RequestInit = {}) => {
      if (String(input).endsWith("/answered")) throw new TypeError("Failed to fetch");
      return base(input, init);
    });
    const { container } = renderWithAppRetries();

    expect(await screen.findByText(CHECK_ERROR)).toBeInTheDocument();
    expect(calls(fetchMock, getAnswered)).toHaveLength(4);
    expect(container.querySelector("form")).toBeNull();
  });

  for (const [label, next, expectForm] of [
    ["answered: false → the form", answeredFalse, true],
    ["answered: true → the answered screen", answeredTrue, false],
  ] as const) {
    it(`AC-FE-035-5: "Reintentar" requests only the check again, shows its loading state meanwhile, then ${label}`, async () => {
      let failing = true;
      const retryReply = gated(next);
      const fetchMock = mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
      const base = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (input: string, init: RequestInit = {}) => {
        if (String(input).endsWith("/answered")) {
          if (failing) {
            return new Response(JSON.stringify(serverError.body), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          return retryReply.respond();
        }
        return base(input, init);
      });
      const { container } = renderPage();
      const user = userEvent.setup();

      const retry = await screen.findByRole("button", { name: "Reintentar" });
      failing = false;
      await user.click(retry);
      // The check-error state stays, with the button in its loading state.
      await waitFor(() => expect(calls(fetchMock, getAnswered)).toHaveLength(2));
      expect(screen.getByText(CHECK_ERROR)).toBeInTheDocument();
      expect(screen.queryByRole("status", { name: "Cargando encuesta..." })).toBeNull();
      const button = screen.getByRole("button", { name: /Reintentar/ });
      expect(button).toHaveAttribute("aria-busy", "true");

      retryReply.release();
      if (expectForm) {
        expect(await screen.findByRole("button", { name: "Enviar respuestas" })).toBeInTheDocument();
        expect(container.querySelectorAll("fieldset")).toHaveLength(3);
      } else {
        expect(
          await screen.findByRole("heading", { name: "Tu IP ya ha respondido a esta encuesta" }),
        ).toBeInTheDocument();
      }
      // Only the check was requested again.
      expect(calls(fetchMock, getSurvey)).toHaveLength(1);
      expect(calls(fetchMock, getAnswered)).toHaveLength(2);
    });
  }

  it("AC-FE-035-5: when the retried check fails again, the check-error state stays", async () => {
    const fetchMock = mockFetch({
      [getSurvey]: { status: 200, body: { data: survey } },
      [getAnswered]: serverError,
    });
    const { container } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(calls(fetchMock, getAnswered)).toHaveLength(2));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reintentar" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    );
    expect(screen.getByText(CHECK_ERROR)).toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
  });

  for (const [label, check] of [
    ["answered: true", answeredTrue],
    ["a failing check", serverError],
  ] as const) {
    it(`AC-FE-035-6 / AC-FE-024-1: a survey 404 shows "Encuesta no encontrada" whatever the check returns (${label})`, async () => {
      mockFetch({ [getSurvey]: notFound, [getAnswered]: check });
      renderPage();

      expect(
        await screen.findByRole("heading", { level: 1, name: "Encuesta no encontrada" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("Tu IP ya ha respondido a esta encuesta")).toBeNull();
      expect(screen.queryByText(CHECK_ERROR)).toBeNull();
    });
  }

  it("AC-FE-035-6: a survey 404 is shown without waiting for a pending check", async () => {
    const checkReply = gated(answeredFalse);
    const fetchMock = mockFetch({ [getSurvey]: notFound });
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input: string, init: RequestInit = {}) => {
      if (String(input).endsWith("/answered")) return checkReply.respond();
      return base(input, init);
    });
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Encuesta no encontrada" }),
    ).toBeInTheDocument();
    expect(calls(fetchMock, getAnswered)).toHaveLength(1);
    checkReply.release();
  });

  it("AC-FE-035-7 / REQ-FE-024: a check failing with 404 is treated as not answered: the form", async () => {
    const fetchMock = mockFetch({
      [getSurvey]: { status: 200, body: { data: survey } },
      [getAnswered]: notFound,
    });
    const { container } = renderWithAppRetries();

    expect(await screen.findByRole("button", { name: "Enviar respuestas" })).toBeInTheDocument();
    expect(container.querySelectorAll("fieldset")).toHaveLength(3);
    expect(screen.queryByText(CHECK_ERROR)).toBeNull();
    // The 404 went through the normal retries (REQ-FE-010).
    expect(calls(fetchMock, getAnswered)).toHaveLength(4);
  });

  it("AC-FE-035-8: focus regained, network reconnect and a 201 submission send no new check; the thank-you state stays", async () => {
    const fetchMock = mockFetch({
      [getSurvey]: { status: 200, body: { data: survey } },
      [getAnswered]: answeredFalse,
      [postAnswer]: { status: 201, body: { data: { id: "a1" } } },
    });
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "Enviar respuestas" });
    expect(calls(fetchMock, getAnswered)).toHaveLength(1);

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls(fetchMock, getAnswered)).toHaveLength(1);

    await user.click(screen.getByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));
    expect(await screen.findByText("¡Muchas gracias!")).toBeInTheDocument();

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls(fetchMock, getAnswered)).toHaveLength(1);
    expect(screen.getByText("¡Muchas gracias!")).toBeInTheDocument();
  });

  it("AC-FE-035-9 / AC-FE-023-6 / DEV-007: a submission rejected with 403 replaces the form with the answered screen and no toast", async () => {
    mockFetch({
      [getSurvey]: { status: 200, body: { data: survey } },
      [getAnswered]: answeredFalse,
      [postAnswer]: alreadyAnswered,
    });
    const { container } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Tu IP ya ha respondido a esta encuesta",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen.queryByText("Your IP already submitted an answer for this survey"),
    ).toBeNull();
    expect(container.querySelector("[data-sonner-toast]")).toBeNull();
  });

  it("AC-FE-023-5: a 500 on submit shows its detail in a toast and keeps the form", async () => {
    mockFetch({
      [getSurvey]: { status: 200, body: { data: survey } },
      [getAnswered]: answeredFalse,
      [postAnswer]: serverError,
    });
    const { container } = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    expect(await screen.findByText("Boom")).toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeNull();
    expect(screen.queryByText("Tu IP ya ha respondido a esta encuesta")).toBeNull();
  });

  it("REQ-FE-035 / REQ-FE-012: the check goes through the generated hook and query key", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(import.meta.dirname, "../src/pages/SurveyAnsweringPage.tsx"),
      "utf8",
    );
    expect(source).toContain("useGetSurveyAnsweredStatus(");
    expect(source).toContain("getGetSurveyAnsweredStatusQueryKey(");
    expect(source).not.toMatch(/["'`]\/api\/v1\/surveys\/[^"'`]*answered/);
  });
});
