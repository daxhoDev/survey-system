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
    getIsLockedBySlug: vi.fn().mockResolvedValue({ isLocked: false }),
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

  it("API-17: 409 Conflict when the new name's slug is taken", async () => {
    repo.getSlugBySlug.mockResolvedValue({ slug: "a-brand-new-name" });
    await expect(
      service.updateOneBySlug(active.slug, { name: "A brand new name" }),
    ).rejects.toMatchObject({ status: 409, title: "Conflict" });
  });

  it("SURV-14.1: 404 for an unknown survey", async () => {
    repo.getIsLockedBySlug.mockResolvedValue(null);
    await expect(
      service.updateOneBySlug("missing", { isActive: true }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it.each([
    ["name", { name: "A brand new name" }],
    ["questions", { questions }],
    ["name and isActive", { isActive: false, name: "A brand new name" }],
  ])("SURV-03, SURV-14.2: a locked survey rejects changes to %s", async (_label, body) => {
    repo.getIsLockedBySlug.mockResolvedValue({ isLocked: true });
    await expect(
      service.updateOneBySlug(active.slug, body as never),
    ).rejects.toMatchObject({ status: 400, title: "Survey already activated" });
    expect(repo.updateOneBySlug).not.toHaveBeenCalled();
  });

  it("SURV-03: a locked survey can still be activated and deactivated", async () => {
    repo.getIsLockedBySlug.mockResolvedValue({ isLocked: true });
    await service.updateOneBySlug(active.slug, { isActive: false });
    expect(repo.updateOneBySlug).toHaveBeenCalledOnce();
  });

  it("SURV-14.3: an invalid body is a ZodError, checked after the lock", async () => {
    await expect(
      service.updateOneBySlug(active.slug, { isActive: "yes" } as never),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("SURV-02, SURV-14.5: activating sets isActive, activatedAt and locks the survey", async () => {
    await service.updateOneBySlug(inactive.slug, { isActive: true });
    const changes = repo.updateOneBySlug.mock.calls[0]![1];
    expect(changes).toMatchObject({ isActive: true, isLocked: true });
    expect(changes.activatedAt).toBeInstanceOf(Date);
  });

  it("SURV-02, SURV-14.5: deactivating clears activatedAt but never unlocks", async () => {
    await service.updateOneBySlug(active.slug, { isActive: false });
    const changes = repo.updateOneBySlug.mock.calls[0]![1];
    expect(changes).toMatchObject({ isActive: false, activatedAt: null });
    expect(changes).not.toHaveProperty("isLocked");
  });

  it("SURV-14.5, 14.6: without isActive, activation fields are untouched and updatedAt is set", async () => {
    await service.updateOneBySlug(inactive.slug, { name: "Renamed survey" });
    const changes = repo.updateOneBySlug.mock.calls[0]![1];
    expect(changes).not.toHaveProperty("isActive");
    expect(changes).not.toHaveProperty("activatedAt");
    expect(changes).not.toHaveProperty("isLocked");
    expect(changes.updatedAt).toBeInstanceOf(Date);
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
