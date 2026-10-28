import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
    mockFetch({ [getSurvey]: notFound });
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: fiveQuestions } } });
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
    const { container } = renderPage();
    await screen.findByText(survey.name);

    const number = container.querySelector("fieldset legend > span")!;
    expect(number).toHaveClass("lg:absolute");
    expect(number.className).toMatch(/lg:-left-/);
    expect(container.querySelector("fieldset")).toHaveClass("relative");
  });

  it("AC-FE-034-1: long unbroken question and option text wraps instead of scrolling sideways", async () => {
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
    renderPage();
    await screen.findByText(survey.name);

    expect(screen.getByText("Are you happy at our company?")).toHaveClass("min-w-0", "wrap-anywhere");
    for (const option of ["Yes", "Gym"]) {
      expect(screen.getByText(option)).toHaveClass("min-w-0", "wrap-anywhere");
    }
  });

  it("AC-FE-034-2: a click anywhere in an option row toggles it, and the row is at least 44 px tall", async () => {
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
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
    const fetchMock = mockFetch({ [getSurvey]: { status: 200, body: { data: fiveQuestions } } });
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: fiveQuestions } } });
    renderPage();
    const user = userEvent.setup();
    await screen.findByText(fiveQuestions.name);

    await user.click(screen.getByText("Yes"));
    await user.click(screen.getByRole("button", { name: "Enviar respuestas" }));

    expect(await screen.findAllByText("Esta pregunta es obligatoria")).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: /What should we improve/ })).toHaveFocus();
  });

  it("REQ-FE-034 errors / AC-BRAND-019-2: rust with an icon, fieldset aria-invalid and aria-describedby to the message", async () => {
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
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

  it("AC-FE-023-5: an API error shows its detail in a toast and keeps the entered values", async () => {
    mockFetch({
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: fiveQuestions } } });
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
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
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
