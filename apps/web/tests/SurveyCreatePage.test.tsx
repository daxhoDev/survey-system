import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
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
