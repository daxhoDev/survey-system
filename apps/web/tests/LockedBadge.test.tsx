import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Surveys from "@/components/Surveys";
import { mockFetch, renderWithProviders } from "./helpers";

const base = {
  questions: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: null,
  deletedAt: null,
  activatedAt: null,
};

describe("LockedBadge (FE-26)", () => {
  it("marks only locked surveys in the dashboard table and explains why on hover", async () => {
    mockFetch({
      "GET /api/v1/surveys": {
        status: 200,
        body: {
          data: [
            { ...base, id: "1", name: "Draft survey", slug: "draft", isActive: false, isLocked: false },
            { ...base, id: "2", name: "Locked survey", slug: "locked", isActive: false, isLocked: true },
          ],
          meta: { results: 2, page: 1, limit: 10 },
        },
      },
    });
    renderWithProviders(<Surveys />);

    const lockedRow = (await screen.findByText("Locked survey")).closest("tr")!;
    const draftRow = screen.getByText("Draft survey").closest("tr")!;
    expect(within(lockedRow).getByText("Bloqueada")).toBeInTheDocument();
    expect(within(draftRow).queryByText("Bloqueada")).not.toBeInTheDocument();

    await userEvent.setup().hover(within(lockedRow).getByText("Bloqueada"));
    expect(
      (await screen.findAllByText("Ya fue activada: nombre y preguntas no se pueden modificar"))[0],
    ).toBeInTheDocument();
  });
});
