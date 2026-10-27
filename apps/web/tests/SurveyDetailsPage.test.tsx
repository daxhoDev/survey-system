import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
