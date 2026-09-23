import { v7 } from "uuid";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import AnswerRepository from "../../src/repositories/answerRepository.js";
import RefreshTokenRepository from "../../src/repositories/refreshTokenRepository.js";
import SurveyRepository from "../../src/repositories/surveyRepository.js";
import UserRepository from "../../src/repositories/userRepository.js";
import { questions } from "../helpers/fixtures.js";
import { prisma, resetDatabase } from "../helpers/database.js";

const surveys = new SurveyRepository();
const answers = new AnswerRepository();
const users = new UserRepository();
const refreshTokens = new RefreshTokenRepository();

async function createSurvey(name: string, extra: Record<string, unknown> = {}) {
  const slug = name.toLowerCase().replaceAll(" ", "-");
  await surveys.createOne({ id: v7(), slug, name, questions } as never);
  if (Object.keys(extra).length) {
    await prisma.surveys.update({ where: { slug }, data: extra });
  }
  return (await prisma.surveys.findUniqueOrThrow({ where: { slug } })).id;
}

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("SurveyRepository.getAll", () => {
  beforeEach(async () => {
    await createSurvey("Alpha survey", {
      created_at: new Date(2026, 0, 10, 12),
      is_active: true,
    });
    await createSurvey("Beta survey", { created_at: new Date(2026, 0, 11, 12) });
    await createSurvey("Gamma survey", {
      created_at: new Date(2026, 0, 12, 12),
      is_active: true,
    });
    await createSurvey("Deleted survey", { deleted_at: new Date() });
  });

  const names = (list: { name: string }[]) => list.map((s) => s.name);

  it("SURV-05: excludes deleted surveys", async () => {
    expect(names(await surveys.getAll({}))).not.toContain("Deleted survey");
  });

  it("filters by active, by case-insensitive search and by creation day", async () => {
    expect(names(await surveys.getAll({ active: true, sort: "name" }))).toEqual([
      "Alpha survey",
      "Gamma survey",
    ]);
    expect(names(await surveys.getAll({ search: "BETA" }))).toEqual(["Beta survey"]);
    expect(
      names(await surveys.getAll({ date: new Date(2026, 0, 11) })),
    ).toEqual(["Beta survey"]);
  });

  it("sorts by name and by creation date", async () => {
    expect(names(await surveys.getAll({ sort: "-name" }))).toEqual([
      "Gamma survey",
      "Beta survey",
      "Alpha survey",
    ]);
    expect(names(await surveys.getAll({ sort: "creation" }))).toEqual([
      "Alpha survey",
      "Beta survey",
      "Gamma survey",
    ]);
  });

  it("SURV-06: offset is (page - 1) * limit", async () => {
    expect(names(await surveys.getAll({ sort: "name", page: 2, limit: 2 }))).toEqual([
      "Gamma survey",
    ]);
    expect(names(await surveys.getAll({ sort: "name", page: 2, limit: 1 }))).toEqual([
      "Beta survey",
    ]);
  });
});

describe("SurveyRepository single survey", () => {
  it("SURV-11: getBySlug ignores deleted surveys", async () => {
    await createSurvey("Deleted survey", { deleted_at: new Date() });
    expect(await surveys.getBySlug("deleted-survey")).toBeNull();
  });

  it("updateOneBySlug leaves name and isActive untouched when absent", async () => {
    await createSurvey("Alpha survey", { is_active: true });
    const updated = await surveys.updateOneBySlug("alpha-survey", {
      slug: "alpha-survey",
      updatedAt: new Date(),
      activatedAt: new Date(),
    });
    expect(updated).toMatchObject({ name: "Alpha survey", isActive: true });
  });
});

describe("statistics", () => {
  it("STAT-02, STAT-04, STAT-07: counts answers and selected options", async () => {
    const surveyId = await createSurvey("Stats survey", { is_active: true });
    await answers.createOne({
      id: v7(),
      surveyId,
      originIp: "10.0.0.1",
      responses: [
        { id: 1, content: [1] },
        { id: 2, content: [1, 2] },
        { id: 3, content: "Great" },
      ],
    });
    await answers.createOne({
      id: v7(),
      surveyId,
      originIp: "10.0.0.2",
      responses: [{ id: 1, content: [2] }],
    });

    expect(await surveys.getSurveyStatsBySlug("stats-survey")).toEqual({
      totalAnswers: 2n,
      completedAnswers: 1n,
      incompleteAnswers: 1n,
      questionCount: 3,
    });

    const options = await surveys.getResponsesOptionsStatsBySlug("stats-survey");
    const counts = Object.fromEntries(
      options.map((q) => [
        q.questionId,
        Object.fromEntries(q.options.map((o) => [o.optionContent, o.responseCount])),
      ]),
    );
    expect(counts).toEqual({
      1: { Yes: 1, No: 1 },
      2: { Gym: 1, Lunch: 1, Training: 0 },
    });
  });
});

describe("AnswerRepository", () => {
  it("DATA-07: the same IP can answer different surveys, but only once each", async () => {
    const first = await createSurvey("First survey");
    const second = await createSurvey("Second survey");
    const answer = { responses: [{ id: 1, content: [1] }], originIp: "10.0.0.1" };

    await answers.createOne({ id: v7(), surveyId: first, ...answer });
    await answers.createOne({ id: v7(), surveyId: second, ...answer });
    await expect(
      answers.createOne({ id: v7(), surveyId: first, ...answer }),
    ).rejects.toThrow();

    expect(await answers.getIpBySurveyIdAndIp(first, "10.0.0.1")).toEqual({
      originIp: "10.0.0.1",
    });
    expect(await answers.getIpBySurveyIdAndIp(first, "10.0.0.2")).toBeNull();
  });

  it("ANS-08: getById only finds non-deleted answers of the given survey", async () => {
    const first = await createSurvey("First survey");
    const second = await createSurvey("Second survey");
    const id = v7();
    await answers.createOne({
      id,
      surveyId: first,
      originIp: "10.0.0.1",
      responses: [{ id: 1, content: [1] }],
    });

    expect(await answers.getById(first, id)).toMatchObject({
      id,
      surveys: { name: "First survey" },
    });
    expect(await answers.getById(second, id)).toBeNull();

    await answers.deleteById(id);
    expect(await answers.getById(first, id)).toBeNull();
    expect(await answers.getAllFromSurvey(first)).toEqual([]);
  });
});

describe("users and refresh tokens", () => {
  it("AUTH-03: a user has at most one refresh token", async () => {
    const userId = v7();
    await users.createOne({
      id: userId,
      email: "owner@example.com",
      username: "owner",
      password: "hash",
    });
    const token = { userId, expiresAt: new Date(Date.now() + 60_000) };

    await refreshTokens.createOne({ id: v7(), tokenHash: "a", ...token });
    await expect(
      refreshTokens.createOne({ id: v7(), tokenHash: "b", ...token }),
    ).rejects.toThrow();

    expect(await refreshTokens.getByHash("a")).toMatchObject({
      userId,
      users: { email: "owner@example.com" },
    });
  });

  it("AUTH-16: deleteByUserId succeeds when there is no token", async () => {
    await expect(refreshTokens.deleteByUserId(v7())).resolves.toBeUndefined();
  });
});
