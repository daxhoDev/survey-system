import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../../src/app.js";
import { questions } from "../../helpers/fixtures.js";
import { resetStore } from "../../helpers/fakeRepositories.js";

// Rate limits have their own test (rateLimit.test.ts); here they would block
// the many requests each test makes.
vi.mock("../../../src/utils/limiter.js", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../../../src/repositories/userRepository.js", async () => ({
  default: (await import("../../helpers/fakeRepositories.js")).FakeUserRepository,
}));
vi.mock("../../../src/repositories/refreshTokenRepository.js", async () => ({
  default: (await import("../../helpers/fakeRepositories.js"))
    .FakeRefreshTokenRepository,
}));
vi.mock("../../../src/repositories/surveyRepository.js", async () => ({
  default: (await import("../../helpers/fakeRepositories.js")).FakeSurveyRepository,
}));
vi.mock("../../../src/repositories/answerRepository.js", async () => ({
  default: (await import("../../helpers/fakeRepositories.js")).FakeAnswerRepository,
}));

const account = {
  email: "owner@example.com",
  username: "owner",
  password: "password123",
  passwordConfirm: "password123",
};

type Cookies = Record<string, string>;

function cookiesOf(res: request.Response): Cookies {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  return Object.fromEntries(
    (header ?? []).map((c) => {
      const [pair] = c.split(";");
      const index = pair!.indexOf("=");
      return [pair!.slice(0, index), c];
    }),
  );
}

const value = (cookie: string) => cookie.split(";")[0]!.split("=").slice(1).join("=");

async function signup() {
  const res = await request(app).post("/api/v1/users/signup").send(account);
  const cookies = cookiesOf(res);
  return { res, jwt: `jwt=${value(cookies.jwt!)}`, refresh: `refresh=${value(cookies.refresh!)}` };
}

async function createSurvey(jwt: string, name = "Employee Satisfaction Survey") {
  return request(app)
    .post("/api/v1/surveys")
    .set("Cookie", jwt)
    .send({ name, questions });
}

beforeEach(() => {
  resetStore();
});

describe("routing", () => {
  it("API-03: unknown routes return a 404 problem", async () => {
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.title).toBe("Method not allowed for this path");
  });

  it.each([
    ["get", "/api/v1/surveys"],
    ["post", "/api/v1/surveys"],
    ["patch", "/api/v1/surveys/some-survey"],
    ["delete", "/api/v1/surveys/some-survey"],
    ["get", "/api/v1/surveys/some-survey/stats"],
    ["get", "/api/v1/surveys/some-survey/answers"],
    ["get", "/api/v1/surveys/some-survey/answers/some-id"],
    ["delete", "/api/v1/surveys/some-survey/answers/some-id"],
    ["post", "/api/v1/users/logout"],
    ["get", "/api/v1/users/me"],
  ] as const)("API-02: %s %s requires a session", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe("auth endpoints", () => {
  it("AUTH-01, AUTH-12: signup sets HTTP-only cookies and never returns the password", async () => {
    const { res } = await signup();
    const cookies = cookiesOf(res);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: account.email, username: account.username });
    expect(res.body.data).not.toHaveProperty("password");
    expect(cookies.jwt).toMatch(/HttpOnly/i);
    expect(cookies.jwt).toMatch(/Max-Age=900/);
    expect(cookies.refresh).toMatch(/HttpOnly/i);
    expect(cookies.refresh).toMatch(/Path=\/api\/v1\/users\/refresh/);
    expect(cookies.refresh).toMatch(/Max-Age=604800/);
  });

  it("AUTH-14: unknown email and wrong password get identical 401 responses", async () => {
    await signup();
    const unknown = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "nobody@example.com", password: account.password });
    const wrong = await request(app)
      .post("/api/v1/users/login")
      .send({ email: account.email, password: "wrong-password" });

    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("AUTH-15: login returns the user and both cookies", async () => {
    await signup();
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: account.email, password: account.password });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: account.email });
    expect(Object.keys(cookiesOf(res))).toEqual(
      expect.arrayContaining(["jwt", "refresh"]),
    );
  });

  it("AUTH-21: /me returns the token payload without the envelope", async () => {
    const { jwt } = await signup();
    const res = await request(app).get("/api/v1/users/me").set("Cookie", jwt);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: account.email, username: account.username });
    expect(res.body).not.toHaveProperty("data");
  });

  it("AUTH-18: refresh without the cookie is 401 Invalid token", async () => {
    const res = await request(app).post("/api/v1/users/refresh");
    expect(res.status).toBe(401);
    expect(res.body.title).toBe("Invalid token");
  });

  it("AUTH-04, AUTH-20: refresh rotates the token and the old one stops working", async () => {
    const { refresh } = await signup();
    const first = await request(app).post("/api/v1/users/refresh").set("Cookie", refresh);
    const reused = await request(app).post("/api/v1/users/refresh").set("Cookie", refresh);

    expect(first.status).toBe(204);
    expect(Object.keys(cookiesOf(first))).toEqual(
      expect.arrayContaining(["jwt", "refresh"]),
    );
    expect(reused.status).toBe(401);
  });

  it("AUTH-16: logout is idempotent and clears both cookies", async () => {
    const { jwt } = await signup();
    const first = await request(app).post("/api/v1/users/logout").set("Cookie", jwt);
    const second = await request(app).post("/api/v1/users/logout").set("Cookie", jwt);

    for (const res of [first, second]) {
      expect(res.status).toBe(204);
      const cookies = cookiesOf(res);
      expect(cookies.jwt).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect(cookies.refresh).toMatch(/Expires=Thu, 01 Jan 1970/);
    }
  });
});

describe("survey endpoints", () => {
  it("SURV-01, SURV-10: creating a survey returns 201 { data } and it starts inactive", async () => {
    const { jwt } = await signup();
    const res = await createSurvey(jwt);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      slug: "employee-satisfaction-survey",
      isActive: false,
    });
  });

  it("SURV-07: the list is wrapped with { data, meta: { results, page, limit } }", async () => {
    const { jwt } = await signup();
    await createSurvey(jwt);
    const res = await request(app).get("/api/v1/surveys").set("Cookie", jwt);

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ results: 1, page: 1, limit: 10 });
  });

  it("SURV-05: invalid query params → 422", async () => {
    const { jwt } = await signup();
    const res = await request(app).get("/api/v1/surveys?page=-1").set("Cookie", jwt);
    expect(res.status).toBe(422);
  });

  it("SURV-12: an inactive survey is hidden from anonymous users only", async () => {
    const { jwt } = await signup();
    await createSurvey(jwt);
    const path = "/api/v1/surveys/employee-satisfaction-survey";

    expect((await request(app).get(path)).status).toBe(404);
    expect((await request(app).get(path).set("Cookie", jwt)).status).toBe(200);

    await request(app).patch(path).set("Cookie", jwt).send({ isActive: true });
    const anonymous = await request(app).get(path);
    expect(anonymous.status).toBe(200);
    expect(anonymous.body.data.isActive).toBe(true);
  });

  it("SURV-17: deleting a survey returns 204 and it disappears", async () => {
    const { jwt } = await signup();
    await createSurvey(jwt);
    const path = "/api/v1/surveys/employee-satisfaction-survey";

    expect((await request(app).delete(path).set("Cookie", jwt)).status).toBe(204);
    expect((await request(app).get(path).set("Cookie", jwt)).status).toBe(404);
  });
});

describe("answer endpoints", () => {
  const surveyPath = "/api/v1/surveys/employee-satisfaction-survey";
  const answersPath = `${surveyPath}/answers`;
  const body = { responses: [{ id: 1, content: [1] }] };

  async function activeSurvey() {
    const session = await signup();
    await createSurvey(session.jwt);
    await request(app)
      .patch(surveyPath)
      .set("Cookie", session.jwt)
      .send({ isActive: true });
    return session;
  }

  it("ANS-05: answering an inactive survey returns 404", async () => {
    const { jwt } = await signup();
    await createSurvey(jwt);
    const res = await request(app).post(answersPath).send(body);
    expect(res.status).toBe(404);
  });

  it("ANS-01: a malformed body returns 422", async () => {
    await activeSurvey();
    const res = await request(app).post(answersPath).send({ nope: true });
    expect(res.status).toBe(422);
  });

  it("ANS-03, ANS-12: one answer per IP and survey", async () => {
    await activeSurvey();
    const first = await request(app).post(answersPath).send(body);
    const second = await request(app).post(answersPath).send(body);

    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ responses: body.responses });
    expect(second.status).toBe(403);
  });

  it("ANS-08, ANS-09, ANS-10, ANS-11: answers are reachable only through their survey", async () => {
    const { jwt } = await activeSurvey();
    const created = await request(app).post(answersPath).send(body);
    const id = created.body.data.id;

    const list = await request(app).get(answersPath).set("Cookie", jwt);
    expect(list.body.meta).toEqual({ results: 1 });

    const one = await request(app).get(`${answersPath}/${id}`).set("Cookie", jwt);
    expect(one.status).toBe(200);
    expect(one.body.data.surveys).toMatchObject({ name: "Employee Satisfaction Survey" });

    await createSurvey(jwt, "Another survey name");
    const elsewhere = await request(app)
      .get(`/api/v1/surveys/another-survey-name/answers/${id}`)
      .set("Cookie", jwt);
    expect(elsewhere.status).toBe(404);

    const removed = await request(app).delete(`${answersPath}/${id}`).set("Cookie", jwt);
    expect(removed.status).toBe(204);
    const gone = await request(app).get(`${answersPath}/${id}`).set("Cookie", jwt);
    expect(gone.status).toBe(404);
    expect(gone.body.detail).toBe("The requested answer doesn't exist");
  });

  it("SURV-18: answers of a deleted survey are unreachable", async () => {
    const { jwt } = await activeSurvey();
    await request(app).post(answersPath).send(body);
    await request(app).delete(surveyPath).set("Cookie", jwt);

    const res = await request(app).get(answersPath).set("Cookie", jwt);
    expect(res.status).toBe(404);
    expect(res.body.detail).toBe("The requested survey doesn't exist");
  });
});
