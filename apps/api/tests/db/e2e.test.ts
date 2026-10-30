import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../src/app.js";
import RefreshTokenRepository from "../../src/repositories/refreshTokenRepository.js";
import UserRepository from "../../src/repositories/userRepository.js";
import AuthService from "../../src/services/authService.js";
import { v7 } from "uuid";
import { questions } from "../helpers/fixtures.js";
import { prisma, resetDatabase } from "../helpers/database.js";

// Rate limits are covered in tests/unit/http/rateLimit.test.ts.
vi.mock("../../src/utils/limiter.js", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const owner = { email: "owner@example.com", username: "owner", password: "password123" };

// There is no public signup (AUTH-13): the first account is created as the
// create-user command does (AUTH-31).
async function createOwner() {
  await new AuthService(new UserRepository(), new RefreshTokenRepository()).createAccount({
    ...owner,
    passwordConfirm: owner.password,
  });
}

const jwtOf = (res: request.Response) =>
  (res.headers["set-cookie"] as unknown as string[])
    .find((c) => c.startsWith("jwt="))!
    .split(";")[0]!;

async function login(email = owner.email, password = owner.password) {
  return request(app).post("/api/v1/users/login").send({ email, password });
}

describe("full flow against PostgreSQL", () => {
  it("login → create → activate → answer → stats → delete", async () => {
    await createOwner();
    const session = await login();
    expect(session.status).toBe(200);
    const jwt = jwtOf(session);

    const created = await request(app)
      .post("/api/v1/surveys")
      .set("Cookie", jwt)
      .send({ name: "Employee Satisfaction Survey", questions });
    expect(created.status).toBe(201);
    const path = `/api/v1/surveys/${created.body.data.slug}`;

    expect((await request(app).get(path)).status).toBe(404);
    const activated = await request(app)
      .patch(path)
      .set("Cookie", jwt)
      .send({ isActive: true });
    expect(activated.body.data.isActive).toBe(true);

    const answer = await request(app)
      .post(`${path}/answers`)
      .send({ responses: [{ id: 1, content: [1] }, { id: 2, content: [2, 3] }] });
    expect(answer.status).toBe(201);
    const repeated = await request(app)
      .post(`${path}/answers`)
      .send({ responses: [{ id: 1, content: [2] }] });
    expect(repeated.status).toBe(403);

    const stats = await request(app).get(`${path}/stats`).set("Cookie", jwt);
    expect(stats.status).toBe(200);
    expect(stats.body.data).toMatchObject({
      totalAnswers: 1,
      completedAnswers: 0,
      incompleteAnswers: 1,
      questionCount: 3,
    });

    const list = await request(app).get(`${path}/answers`).set("Cookie", jwt);
    expect(list.body.meta.results).toBe(1);

    expect((await request(app).delete(path).set("Cookie", jwt)).status).toBe(204);
    expect(
      (await request(app).get(`${path}/answers`).set("Cookie", jwt)).status,
    ).toBe(404);
  });

  it("AUTH-14: login with an unknown email and a wrong password look the same", async () => {
    await createOwner();
    const unknown = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "nobody@example.com", password: "password123" });
    const wrong = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "owner@example.com", password: "wrong-password" });

    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("AUTH-13: POST /users/signup does not exist", async () => {
    const res = await request(app)
      .post("/api/v1/users/signup")
      .send({ ...owner, passwordConfirm: owner.password });
    expect(res.status).toBe(404);
    expect(await prisma.users.count()).toBe(0);
  });

  it("AUTH-24…AUTH-29: invite → list → check the link → accept → log in", async () => {
    await createOwner();
    const jwt = jwtOf(await login());
    const invitee = "new.user@example.com";

    const created = await request(app)
      .post("/api/v1/invitations")
      .set("Cookie", jwt)
      .send({ email: invitee });
    expect(created.status).toBe(201);
    const { token, invitation } = created.body.data;

    const list = await request(app).get("/api/v1/invitations").set("Cookie", jwt);
    expect(list.body).toMatchObject({
      data: [{ id: invitation.id, status: "pending", invitedBy: { username: owner.username } }],
      meta: { results: 1 },
    });

    const info = await request(app).get(`/api/v1/invitations/token/${token}`);
    expect(info.body.data).toEqual({ email: invitee, expiresAt: invitation.expiresAt });

    const accepted = await request(app)
      .post(`/api/v1/invitations/token/${token}/accept`)
      .send({ username: "newuser", password: "password123", passwordConfirm: "password123" });
    expect(accepted.status).toBe(201);
    expect(accepted.body.data).toMatchObject({ email: invitee, username: "newuser" });
    const newJwt = jwtOf(accepted);
    const me = await request(app).get("/api/v1/users/me").set("Cookie", newJwt);
    expect(me.body.data).toMatchObject({ email: invitee, username: "newuser" });
    expect(
      await prisma.refresh_tokens.count({ where: { user_id: accepted.body.data.id } }),
    ).toBe(1);

    expect((await login(invitee, "password123")).status).toBe(200);
    const after = await request(app).get("/api/v1/invitations").set("Cookie", jwt);
    expect(after.body.data[0].status).toBe("accepted");
    expect(
      (await request(app).get(`/api/v1/invitations/token/${token}`)).status,
    ).toBe(404);
  });

  it("AUTH-29: a taken username leaves the invitation pending and creates nothing", async () => {
    await createOwner();
    const jwt = jwtOf(await login());
    const { token } = (
      await request(app)
        .post("/api/v1/invitations")
        .set("Cookie", jwt)
        .send({ email: "new.user@example.com" })
    ).body.data;

    const res = await request(app)
      .post(`/api/v1/invitations/token/${token}/accept`)
      .send({ username: owner.username, password: "password123", passwordConfirm: "password123" });
    expect(res.status).toBe(409);
    expect(await prisma.users.count()).toBe(1);
    expect((await request(app).get(`/api/v1/invitations/token/${token}`)).status).toBe(200);
  });

  it("API-34: ids that are not UUIDs are 422, not a database error", async () => {
    await createOwner();
    const jwt = jwtOf(await login());
    const created = await request(app)
      .post("/api/v1/surveys")
      .set("Cookie", jwt)
      .send({ name: "Employee Satisfaction Survey", questions });
    const answers = `/api/v1/surveys/${created.body.data.slug}/answers/not-a-uuid`;

    for (const res of [
      await request(app).delete("/api/v1/invitations/not-a-uuid").set("Cookie", jwt),
      await request(app).get(answers).set("Cookie", jwt),
      await request(app).delete(answers).set("Cookie", jwt),
    ]) {
      expect(res.status).toBe(422);
      expect(res.body.title).toBe("Validation Error");
    }
  });

  it("AUTH-32: emails are stored and compared in lowercase", async () => {
    await createOwner();
    const jwt = jwtOf(await login(owner.email.toUpperCase()));

    const taken = await request(app)
      .post("/api/v1/invitations")
      .set("Cookie", jwt)
      .send({ email: "Owner@Example.com" });
    expect(taken.status).toBe(409);

    const created = await request(app)
      .post("/api/v1/invitations")
      .set("Cookie", jwt)
      .send({ email: "New.User@Example.COM" });
    await request(app)
      .post(`/api/v1/invitations/token/${created.body.data.token}/accept`)
      .send({ username: "newuser", password: "password123", passwordConfirm: "password123" });

    const emails = (await prisma.users.findMany({ select: { email: true } })).map((u) => u.email);
    expect(emails.sort()).toEqual(["new.user@example.com", "owner@example.com"]);
    expect((await prisma.invitations.findFirstOrThrow()).email).toBe("new.user@example.com");
  });
});

// Direct inserts for the counting scenarios of PH-STAT-2.
let ipSeq = 0;
async function insertSurvey(
  name: string,
  data: {
    is_active?: boolean;
    activated_at?: Date | null;
    deleted_at?: Date | null;
    created_at?: Date;
    questions?: unknown;
  } = {},
) {
  const id = v7();
  await prisma.surveys.create({
    data: {
      id,
      name,
      slug: name.toLowerCase().replaceAll(" ", "-"),
      questions: (data.questions ?? questions) as never,
      is_active: data.is_active ?? false,
      is_locked: data.is_active ?? false,
      activated_at: data.activated_at ?? null,
      deleted_at: data.deleted_at ?? null,
      ...(data.created_at ? { created_at: data.created_at } : {}),
    },
  });
  return id;
}
async function insertAnswer(surveyId: string, answered: number, deleted = false) {
  ipSeq += 1;
  await prisma.answers.create({
    data: {
      id: v7(),
      survey_id: surveyId,
      origin_ip: `10.9.${Math.floor(ipSeq / 250)}.${ipSeq % 250}`,
      responses: questions
        .slice(0, answered)
        .map((q) => ({ id: q.id, content: q.type === "TEXT_ANSWER" ? "ok" : [1] })),
      deleted_at: deleted ? new Date() : null,
    },
  });
}
const at = (minute: number) => new Date(Date.UTC(2026, 5, 1, 12, minute));

describe("GET /api/v1/stats/surveys/active (REQ-STAT-009)", () => {
  const path = "/api/v1/stats/surveys/active";

  it("AC-STAT-009-1: the 8 most recently activated active surveys, newest first", async () => {
    for (let i = 1; i <= 10; i++) {
      await insertSurvey(`Active survey ${String(i).padStart(2, "0")}`, {
        is_active: true,
        activated_at: at(i),
      });
    }
    // Newer activation dates than every active survey: they would come first
    // if they were not filtered out.
    await insertSurvey("Inactive survey", { is_active: false, activated_at: at(30) });
    await insertSurvey("Deleted active survey", {
      is_active: true,
      activated_at: at(31),
      deleted_at: new Date(),
    });
    await createOwner();
    const jwt = jwtOf(await login());

    const res = await request(app).get(path).set("Cookie", jwt);
    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { name: string }) => s.name)).toEqual(
      [10, 9, 8, 7, 6, 5, 4, 3].map((i) => `Active survey ${String(i).padStart(2, "0")}`),
    );
  });

  it("AC-STAT-009-2: counts ignore deleted answers and are JSON numbers", async () => {
    const id = await insertSurvey("Counted survey", { is_active: true, activated_at: at(1) });
    await insertAnswer(id, 3);
    await insertAnswer(id, 3);
    await insertAnswer(id, 2);
    await insertAnswer(id, 3, true);
    await createOwner();
    const jwt = jwtOf(await login());

    const res = await request(app).get(path).set("Cookie", jwt);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        {
          slug: "counted-survey",
          name: "Counted survey",
          totalAnswers: 3,
          completedAnswers: 2,
          incompleteAnswers: 1,
        },
      ],
    });
    expect(res.text).toContain('"totalAnswers":3');
  });

  it("AC-STAT-009-3: a survey without answers has 0 in every count", async () => {
    await insertSurvey("Empty survey", { is_active: true, activated_at: at(1) });
    await createOwner();
    const jwt = jwtOf(await login());

    const res = await request(app).get(path).set("Cookie", jwt);
    expect(res.body.data).toEqual([
      {
        slug: "empty-survey",
        name: "Empty survey",
        totalAnswers: 0,
        completedAnswers: 0,
        incompleteAnswers: 0,
      },
    ]);
  });

  it("AC-STAT-009-4: the same activated_at comes in ascending name order", async () => {
    await insertSurvey("Zulu survey", { is_active: true, activated_at: at(5) });
    await insertSurvey("Alpha survey", { is_active: true, activated_at: at(5) });
    await insertSurvey("Older survey", { is_active: true, activated_at: at(1) });
    await createOwner();
    const jwt = jwtOf(await login());

    const res = await request(app).get(path).set("Cookie", jwt);
    expect(res.body.data.map((s: { name: string }) => s.name)).toEqual([
      "Alpha survey",
      "Zulu survey",
      "Older survey",
    ]);
  });

  it("AC-STAT-009-5: no active survey → 200 { data: [] }", async () => {
    await insertSurvey("Draft survey");
    await createOwner();
    const jwt = jwtOf(await login());

    const res = await request(app).get(path).set("Cookie", jwt);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it("REQ-STAT-009: query parameters are ignored", async () => {
    await insertSurvey("Alpha survey", { is_active: true, activated_at: at(1) });
    await insertSurvey("Beta survey", { is_active: true, activated_at: at(2) });
    await createOwner();
    const jwt = jwtOf(await login());

    const plain = await request(app).get(path).set("Cookie", jwt);
    const withQuery = await request(app)
      .get(`${path}?search=alpha&active=false&limit=1&page=2&sort=name`)
      .set("Cookie", jwt);
    expect(withQuery.status).toBe(200);
    expect(withQuery.body).toEqual(plain.body);
    expect(plain.body.data).toHaveLength(2);
  });

  it("AC-STAT-009-6: without the jwt cookie → 401", async () => {
    expect((await request(app).get(path)).status).toBe(401);
  });
});

describe("answer counts in GET /api/v1/surveys (REQ-SURV-021)", () => {
  const twoQuestions = questions.slice(0, 2);

  it("AC-SURV-021-1, AC-SURV-021-2: answerCount and completedCount per item, as JSON numbers", async () => {
    const counted = await insertSurvey("Counted survey", {
      is_active: true,
      activated_at: at(1),
      questions: twoQuestions,
      created_at: at(2),
    });
    await insertSurvey("Empty survey", { created_at: at(1) });
    await insertAnswer(counted, 2);
    await insertAnswer(counted, 2);
    await insertAnswer(counted, 1);
    await insertAnswer(counted, 2, true);
    await createOwner();
    const jwt = jwtOf(await login());

    const res = await request(app).get("/api/v1/surveys").set("Cookie", jwt);
    expect(res.status).toBe(200);
    const byName = Object.fromEntries(
      res.body.data.map((s: { name: string }) => [s.name, s]),
    );
    expect(byName["Counted survey"]).toMatchObject({ answerCount: 3, completedCount: 2 });
    expect(byName["Empty survey"]).toMatchObject({ answerCount: 0, completedCount: 0 });
    expect(res.text).toContain('"answerCount":3');
    expect(res.text).toContain('"completedCount":2');
    expect(res.body.meta).toEqual({ results: 2, total: 2, page: 1, limit: 10 });
  });

  it("REQ-SURV-021: each page item carries its own counts", async () => {
    const first = await insertSurvey("First survey", { created_at: at(1), is_active: true, activated_at: at(1) });
    const second = await insertSurvey("Second survey", { created_at: at(2), is_active: true, activated_at: at(2) });
    await insertAnswer(first, 3);
    await insertAnswer(second, 3);
    await insertAnswer(second, 1);
    await createOwner();
    const jwt = jwtOf(await login());

    const page2 = await request(app).get("/api/v1/surveys?limit=1&page=2").set("Cookie", jwt);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.data[0]).toMatchObject({ name: "First survey", answerCount: 1, completedCount: 1 });
    const page1 = await request(app).get("/api/v1/surveys?limit=1&page=1").set("Cookie", jwt);
    expect(page1.body.data[0]).toMatchObject({ name: "Second survey", answerCount: 2, completedCount: 1 });
  });

  it("AC-SURV-021-3: GET, POST and PATCH of a single survey carry no counts", async () => {
    await createOwner();
    const jwt = jwtOf(await login());

    const created = await request(app)
      .post("/api/v1/surveys")
      .set("Cookie", jwt)
      .send({ name: "Employee Satisfaction Survey", questions });
    const surveyPath = `/api/v1/surveys/${created.body.data.slug}`;
    const patched = await request(app)
      .patch(surveyPath)
      .set("Cookie", jwt)
      .send({ isActive: true });
    const fetched = await request(app).get(surveyPath).set("Cookie", jwt);

    for (const res of [created, patched, fetched]) {
      expect(res.status).toBeLessThan(300);
      expect(res.body.data).not.toHaveProperty("answerCount");
      expect(res.body.data).not.toHaveProperty("completedCount");
    }
  });
});

describe("GET /api/v1/surveys/:slug/answered (REQ-ANS-013)", () => {
  const answered = (slug: string) => `/api/v1/surveys/${slug}/answered`;
  const responses = [{ id: 1, content: [1] }];
  async function insertAnswerFrom(surveyId: string, ip: string, deleted = false) {
    await prisma.answers.create({
      data: {
        id: v7(),
        survey_id: surveyId,
        origin_ip: ip,
        responses,
        deleted_at: deleted ? new Date() : null,
      },
    });
  }

  it("AC-ANS-013-1: the IP that answered gets answered: true", async () => {
    await insertSurvey("Survey S", { is_active: true, activated_at: at(1) });
    const posted = await request(app).post("/api/v1/surveys/survey-s/answers").send({ responses });
    expect(posted.status).toBe(201);

    const res = await request(app).get(answered("survey-s"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { answered: true } });
  });

  it("AC-ANS-013-2: answers from other IPs to S, and the IP's answer to T, do not count", async () => {
    const s = await insertSurvey("Survey S", { is_active: true, activated_at: at(1) });
    await insertSurvey("Survey T", { is_active: true, activated_at: at(2) });
    const posted = await request(app).post("/api/v1/surveys/survey-t/answers").send({ responses });
    expect(posted.status).toBe(201);
    await insertAnswerFrom(s, "198.51.100.1");
    await insertAnswerFrom(s, "198.51.100.2");

    const res = await request(app).get(answered("survey-s"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { answered: false } });
  });

  it("AC-ANS-013-3: a soft-deleted answer of the IP does not count", async () => {
    const s = await insertSurvey("Survey S", { is_active: true, activated_at: at(1) });
    const posted = await request(app).post("/api/v1/surveys/survey-s/answers").send({ responses });
    expect(posted.status).toBe(201);
    await prisma.answers.updateMany({ where: { survey_id: s }, data: { deleted_at: new Date() } });

    const res = await request(app).get(answered("survey-s"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { answered: false } });
  });

  it("AC-ANS-013-4: unknown, soft-deleted and inactive surveys get the identical 404, with or without a session", async () => {
    await insertSurvey("Inactive survey", { is_active: false });
    await insertSurvey("Deleted survey", { is_active: true, activated_at: at(1), deleted_at: new Date() });
    await createOwner();
    const jwt = jwtOf(await login());

    const results: request.Response[] = [];
    for (const slug of ["does-not-exist", "deleted-survey", "inactive-survey"]) {
      results.push(await request(app).get(answered(slug)));
      results.push(await request(app).get(answered(slug)).set("Cookie", jwt));
    }
    for (const res of results) {
      expect(res.status).toBe(404);
      expect(res.body.title).toBe("Not found");
      expect(res.body.detail).toBe("The requested survey doesn't exist");
    }
  });

  it("AC-ANS-013-5: with TRUST_PROXY=1 the X-Forwarded-For client is evaluated; with TRUST_PROXY=0 the socket address", async () => {
    const s = await insertSurvey("Survey S", { is_active: true, activated_at: at(1) });
    const client = "203.0.113.7";
    await insertAnswerFrom(s, client);

    // TRUST_PROXY=0 (the test default): the header is not trusted.
    const untrusted = await request(app).get(answered("survey-s")).set("X-Forwarded-For", client);
    expect(untrusted.body).toEqual({ data: { answered: false } });

    vi.stubEnv("TRUST_PROXY", "1");
    vi.resetModules();
    try {
      const { default: proxiedApp } = await import("../../src/app.js");
      const trusted = await request(proxiedApp).get(answered("survey-s")).set("X-Forwarded-For", client);
      expect(trusted.status).toBe(200);
      expect(trusted.body).toEqual({ data: { answered: true } });
    } finally {
      const { prisma: freshPrisma } = await import("../../src/lib/prisma.js");
      await freshPrisma.$disconnect();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("AC-ANS-013-6: the check creates or changes no answer or survey row", async () => {
    const s = await insertSurvey("Survey S", { is_active: true, activated_at: at(1) });
    await insertSurvey("Inactive survey", { is_active: false });
    await insertAnswerFrom(s, "198.51.100.1");
    await insertAnswerFrom(s, "198.51.100.2", true);
    const snapshot = async () => ({
      surveys: await prisma.surveys.findMany({ orderBy: { id: "asc" } }),
      answers: await prisma.answers.findMany({ orderBy: { id: "asc" } }),
    });
    const before = await snapshot();

    for (const slug of ["survey-s", "inactive-survey", "does-not-exist"]) {
      await request(app).get(answered(slug));
    }

    expect(await snapshot()).toEqual(before);
  });
});
