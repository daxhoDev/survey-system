import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import AnswerService from "../../../src/services/answerService.js";
import type {
  IAnswerRepository,
  ISurveyRepository,
} from "../../../src/types.js";
import { buildAnswer, buildSurvey } from "../../helpers/fixtures.js";

const active = buildSurvey();
const inactive = buildSurvey({
  id: "0190a0a0-0000-7000-8000-000000000002",
  slug: "inactive-survey",
  isActive: false,
});
const surveysBySlug: Record<string, ReturnType<typeof buildSurvey>> = {
  [active.slug]: active,
  [inactive.slug]: inactive,
};

let answerRepo: { [K in keyof IAnswerRepository]: ReturnType<typeof vi.fn> };
let surveyRepo: Pick<
  { [K in keyof ISurveyRepository]: ReturnType<typeof vi.fn> },
  "getBySlug"
>;
let service: AnswerService;

beforeEach(() => {
  answerRepo = {
    getAllFromSurvey: vi.fn().mockResolvedValue([buildAnswer()]),
    getById: vi.fn().mockResolvedValue(null),
    createOne: vi.fn(async (data) => buildAnswer(data)),
    deleteById: vi.fn().mockResolvedValue(undefined),
    getIpBySurveyIdAndIp: vi.fn().mockResolvedValue(null),
  };
  surveyRepo = {
    getBySlug: vi.fn(async (slug: string) => surveysBySlug[slug] ?? null),
  };
  service = new AnswerService(
    answerRepo as unknown as IAnswerRepository,
    surveyRepo as unknown as ISurveyRepository,
  );
});

const validAnswer = {
  responses: [
    { id: 1, content: [1] },
    { id: 2, content: [1, 3] },
    { id: 3, content: "All good" },
  ],
};

describe("AnswerService.createOne", () => {
  it("ANS-01: rejects a malformed body with a ZodError", async () => {
    await expect(
      service.createOne({ foo: "bar" } as never, active.slug, "1.1.1.1"),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("ANS-02: 404 for an unknown survey", async () => {
    await expect(
      service.createOne(validAnswer as never, "missing", "1.1.1.1"),
    ).rejects.toMatchObject({
      status: 404,
      title: "Not found",
      detail: "The survey you are trying to answer doesn't exist",
    });
  });

  it("ANS-05: an inactive survey gets the same 404 as a missing one", async () => {
    const missing = await service
      .createOne(validAnswer as never, "missing", "1.1.1.1")
      .catch((e) => e);
    const inactiveError = await service
      .createOne(validAnswer as never, inactive.slug, "1.1.1.1")
      .catch((e) => e);

    expect(inactiveError).toMatchObject({
      status: missing.status,
      title: missing.title,
      detail: missing.detail,
    });
    expect(answerRepo.createOne).not.toHaveBeenCalled();
  });

  it("ANS-03: 403 when the IP already answered this survey", async () => {
    answerRepo.getIpBySurveyIdAndIp.mockResolvedValue({ originIp: "1.1.1.1" });

    await expect(
      service.createOne(validAnswer as never, active.slug, "1.1.1.1"),
    ).rejects.toMatchObject({
      status: 403,
      title: "You already submitted an answer",
    });
    expect(answerRepo.getIpBySurveyIdAndIp).toHaveBeenCalledWith(
      active.id,
      "1.1.1.1",
    );
  });

  it("ANS-03: checks the IP only after resolving the survey (ANS-02 first)", async () => {
    await service
      .createOne(validAnswer as never, "missing", "1.1.1.1")
      .catch(() => undefined);

    expect(answerRepo.getIpBySurveyIdAndIp).not.toHaveBeenCalled();
  });

  it("stores a valid answer for the resolved survey and IP", async () => {
    await service.createOne(validAnswer as never, active.slug, "1.1.1.1");

    expect(answerRepo.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        surveyId: active.id,
        originIp: "1.1.1.1",
        responses: validAnswer.responses,
      }),
    );
  });
});

describe("AnswerService.validateAnswerCreation (ANS-06)", () => {
  const cases: [string, unknown[], string][] = [
    ["missing required responses", [], "There are missing or exceeding responses"],
    [
      "more responses than questions",
      [
        { id: 1, content: [1] },
        { id: 2, content: [1] },
        { id: 3, content: "ok" },
        { id: 3, content: "ok" },
      ],
      "There are missing or exceeding responses",
    ],
    [
      "a response id that is not a question",
      [{ id: 9, content: [1] }],
      "Each response id must match a question id",
    ],
    [
      "a required question left unanswered",
      [{ id: 3, content: "ok" }],
      "All required questions must be answered",
    ],
    [
      "a repeated response id",
      [
        { id: 1, content: [1] },
        { id: 1, content: [2] },
      ],
      "Each response id must be unique",
    ],
    [
      "a single select option that does not exist",
      [{ id: 1, content: [7] }],
      "The response content for a single selection question must be an array with it's option id",
    ],
    [
      "a multi select option that does not exist",
      [
        { id: 1, content: [1] },
        { id: 2, content: [1, 7] },
      ],
      "The response content for a multi selection question must be an array of valid option id's",
    ],
    [
      "a text question answered with an array",
      [
        { id: 1, content: [1] },
        { id: 3, content: [1] },
      ],
      "The response content for a text question must be a string",
    ],
  ];

  it.each(cases)("400 for %s", (_label, responses, detail) => {
    expect(() =>
      service.validateAnswerCreation(active, { responses } as never),
    ).toThrow(expect.objectContaining({ status: 400, detail }));
  });

  it("accepts a valid answer", () => {
    expect(
      service.validateAnswerCreation(active, validAnswer as never),
    ).toEqual(validAnswer);
  });
});

describe("AnswerService answer routes (ANS-08)", () => {
  const unknownId = "0190a0a0-0000-7000-8000-0000000000ff";

  it("API-34: an id that is not a UUID is a validation error, before any lookup", async () => {
    for (const call of [
      () => service.getById(active.slug, "not-a-uuid"),
      () => service.deleteById(active.slug, "not-a-uuid"),
    ]) {
      await expect(call()).rejects.toMatchObject({ name: "ZodError" });
    }
    expect(answerRepo.getById).not.toHaveBeenCalled();
    expect(answerRepo.deleteById).not.toHaveBeenCalled();
  });

  it("lists the answers of the resolved survey", async () => {
    await service.getAllFromSurvey(active.slug);
    expect(answerRepo.getAllFromSurvey).toHaveBeenCalledWith(active.id);
  });

  it("404 when the survey does not exist", async () => {
    await expect(service.getAllFromSurvey("missing")).rejects.toMatchObject({
      status: 404,
      detail: "The requested survey doesn't exist",
    });
    await expect(service.getById("missing", unknownId)).rejects.toMatchObject({
      status: 404,
      detail: "The requested survey doesn't exist",
    });
  });

  it("looks the answer up inside the resolved survey", async () => {
    const answer = buildAnswer();
    answerRepo.getById.mockResolvedValue(answer);

    await expect(service.getById(active.slug, answer.id)).resolves.toBe(answer);
    expect(answerRepo.getById).toHaveBeenCalledWith(active.id, answer.id);
  });

  it("404 when the answer is missing, deleted or from another survey", async () => {
    await expect(service.getById(active.slug, unknownId)).rejects.toMatchObject({
      status: 404,
      title: "Not found",
      detail: "The requested answer doesn't exist",
    });
  });

  it("deletes only an answer that belongs to the survey", async () => {
    await expect(service.deleteById(active.slug, unknownId)).rejects.toMatchObject({
      status: 404,
    });
    expect(answerRepo.deleteById).not.toHaveBeenCalled();

    answerRepo.getById.mockResolvedValue(buildAnswer());
    await service.deleteById(active.slug, buildAnswer().id);
    expect(answerRepo.deleteById).toHaveBeenCalledWith(buildAnswer().id);
  });
});
