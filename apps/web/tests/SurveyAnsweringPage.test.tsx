import { screen, waitFor } from "@testing-library/react";
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

const getSurvey = "GET /api/v1/surveys/employee-survey";
const postAnswer = "POST /api/v1/surveys/employee-survey/answers";

function renderPage() {
  return renderWithProviders(<SurveyAnsweringPage />, {
    path: "/surveys/:slug",
    route: "/surveys/employee-survey",
  });
}

describe("SurveyAnsweringPage", () => {
  it("FE-23, FE-24: shows 'Encuesta no encontrada' when the survey is missing or inactive", async () => {
    mockFetch({
      [getSurvey]: {
        status: 404,
        body: { status: 404, title: "Not found", detail: "The requested survey doesn't exist" },
      },
    });
    renderPage();

    expect(await screen.findByText("Encuesta no encontrada")).toBeInTheDocument();
  });

  it("FE-23: renders every question and marks the required ones", async () => {
    mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
    renderPage();

    expect(await screen.findByText(survey.name)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getAllByText("*")).toHaveLength(1);
  });

  it("FE-23: does not submit while a required question is unanswered", async () => {
    const fetchMock = mockFetch({ [getSurvey]: { status: 200, body: { data: survey } } });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /enviar/i }));

    expect(await screen.findByText("Esta pregunta es obligatoria")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "POST")).toBe(false);
  });

  it("FE-23: sends [optionId] for single select, omits empty answers and thanks the respondent", async () => {
    const fetchMock = mockFetch({
      [getSurvey]: { status: 200, body: { data: survey } },
      [postAnswer]: { status: 200, body: { data: { id: "a1" } } },
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("No"));
    await user.click(screen.getByLabelText("Lunch"));
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(await screen.findByText("¡Muchas gracias!")).toBeInTheDocument();
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(JSON.parse(String(post[1]!.body))).toEqual({
      responses: [
        { id: 1, content: [2] },
        { id: 2, content: [2] },
      ],
    });
  });

  it("FE-24: a rejected submission shows the API detail in a toast", async () => {
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
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() =>
      expect(
        screen.getByText("The survey you are trying to answer doesn't exist"),
      ).toBeInTheDocument(),
    );
  });
});
