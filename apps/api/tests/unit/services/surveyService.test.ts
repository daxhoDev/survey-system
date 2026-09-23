import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import SurveyService from "../../../src/services/surveyService.js";
import type { ISurveyRepository, Session } from "../../../src/types.js";
import { buildSurvey, questions } from "../../helpers/fixtures.js";

const active = buildSurvey();
const inactive = buildSurvey({ slug: "inactive-survey", isActive: false });

let repo: { [K in keyof ISurveyRepository]: ReturnType<typeof vi.fn> };
let service: SurveyService;

beforeEach(() => {
  repo = {
    getAll: vi.fn().mockResolvedValue([active]),
    getBySlug: vi.fn(
      async (slug: string) =>
        ({ [active.slug]: active, [inactive.slug]: inactive })[slug] ?? null,
    ),
    createOne: vi.fn(async (data) => buildSurvey({ ...data, isActive: false })),
    deleteOneBySlug: vi.fn().mockResolvedValue(undefined),
    updateOneBySlug: vi.fn(async (slug, data) => buildSurvey({ slug, ...data })),
    getSlugBySlug: vi.fn().mockResolvedValue(null),
    getActivatedAtBySlug: vi.fn().mockResolvedValue({ activatedAt: null }),
    getSurveyStatsBySlug: vi.fn().mockResolvedValue(null),
    getResponsesOptionsStatsBySlug: vi.fn().mockResolvedValue([]),
  };
  service = new SurveyService(repo as unknown as ISurveyRepository);
});

describe("SurveyService.getBySlug (SURV-11, SURV-12)", () => {
  const cases: [string, string, Session, number | "ok"][] = [
    ["active", active.slug, "anonymous", "ok"],
    ["active", active.slug, "expired", "ok"],
    ["active", active.slug, "authenticated", "ok"],
    ["inactive", inactive.slug, "anonymous", 404],
    ["inactive", inactive.slug, "expired", 401],
    ["inactive", inactive.slug, "authenticated", "ok"],
    ["missing", "missing", "anonymous", 404],
    ["missing", "missing", "expired", 404],
    ["missing", "missing", "authenticated", 404],
  ];

  it.each(cases)("%s survey, %s session → %s", async (_, slug, session, expected) => {
    const result = service.getBySlug(slug, session);
    if (expected === "ok") {
      await expect(result).resolves.toMatchObject({ slug });
    } else {
      await expect(result).rejects.toMatchObject({ status: expected });
    }
  });

  it("an anonymous request for an inactive survey gets the same 404 as a missing one", async () => {
    const missing = await service.getBySlug("missing", "anonymous").catch((e) => e);
    const hidden = await service
      .getBySlug(inactive.slug, "anonymous")
      .catch((e) => e);

    expect(hidden).toMatchObject({
      status: missing.status,
      title: missing.title,
      detail: missing.detail,
    });
  });

  it("an expired session on an inactive survey gets 401 Token Error", async () => {
    await expect(
      service.getBySlug(inactive.slug, "expired"),
    ).rejects.toMatchObject({
      status: 401,
      title: "Token Error",
      detail: "This token expired, please log in again",
    });
  });
});

describe("SurveyService.createOne", () => {
  const body = { name: "Employee Satisfaction Survey", questions };

  it("SURV-08: derives the slug from the name", async () => {
    await service.createOne(body as never);
    expect(repo.createOne).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "employee-satisfaction-survey" }),
    );
  });

  it("SURV-08: 409 when a non-deleted survey has that slug", async () => {
    repo.getSlugBySlug.mockResolvedValue({ slug: "employee-satisfaction-survey" });
    await expect(service.createOne(body as never)).rejects.toMatchObject({
      status: 409,
      title: "Conflict",
    });
  });

  it("SURV-09: select questions need options and text questions must not have them", async () => {
    const noOptions = {
      name: "A valid name",
      questions: [{ id: 1, name: "Pick one", type: "SINGLE_SELECT", isRequired: true }],
    };
    const textWithOptions = {
      name: "A valid name",
      questions: [
        {
          id: 1,
          name: "Tell us",
          type: "TEXT_ANSWER",
          options: [{ id: 1, content: "x" }],
          isRequired: true,
        },
      ],
    };
    await expect(service.createOne(noOptions as never)).rejects.toBeInstanceOf(ZodError);
    await expect(service.createOne(textWithOptions as never)).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});

describe("SurveyService.deleteOneBySlug (SURV-17)", () => {
  it("404 for an unknown survey", async () => {
    await expect(service.deleteOneBySlug("missing")).rejects.toMatchObject({
      status: 404,
    });
    expect(repo.deleteOneBySlug).not.toHaveBeenCalled();
  });

  it("deletes an existing survey", async () => {
    repo.getSlugBySlug.mockResolvedValue({ slug: active.slug });
    await service.deleteOneBySlug(active.slug);
    expect(repo.deleteOneBySlug).toHaveBeenCalledWith(active.slug);
  });
});

describe("SurveyService.updateOneBySlug", () => {
  it("SURV-15: renaming changes the slug", async () => {
    await service.updateOneBySlug(active.slug, { name: "A brand new name" });
    expect(repo.updateOneBySlug).toHaveBeenCalledWith(
      active.slug,
      expect.objectContaining({ slug: "a-brand-new-name" }),
    );
  });

  it("404 for an unknown survey", async () => {
    repo.getActivatedAtBySlug.mockResolvedValue(null);
    await expect(
      service.updateOneBySlug("missing", { isActive: true }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("SurveyService.getStatsBySlug", () => {
  it("STAT-01: 404 for an unknown survey", async () => {
    await expect(service.getStatsBySlug("missing")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("STAT-07: counts default to 0 when there are no answers", async () => {
    repo.getSlugBySlug.mockResolvedValue({ slug: active.slug });
    await expect(service.getStatsBySlug(active.slug)).resolves.toEqual({
      totalAnswers: 0,
      completedAnswers: 0,
      incompleteAnswers: 0,
      questionCount: 0,
      optionStats: [],
    });
  });
});
