import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../../src/app.js";
import { questions } from "../../helpers/fixtures.js";
import bcrypt from "bcrypt";
import { v7 } from "uuid";
import { resetStore, store } from "../../helpers/fakeRepositories.js";

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
vi.mock("../../../src/repositories/invitationRepository.js", async () => ({
  default: (await import("../../helpers/fakeRepositories.js"))
    .FakeInvitationRepository,
}));
vi.mock("../../../src/repositories/answerRepository.js", async () => ({
  default: (await import("../../helpers/fakeRepositories.js")).FakeAnswerRepository,
}));

const account = {
  email: "owner@example.com",
  username: "owner",
  password: "password123",
};
const passwordHash = bcrypt.hashSync(account.password, 10);

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

// There is no public signup (AUTH-13): the account exists and logs in.
async function signup() {
  store.users.push({
    id: v7(),
    email: account.email,
    username: account.username,
    password: passwordHash,
    createdAt: new Date(),
    deletedAt: null,
  });
  const res = await request(app)
    .post("/api/v1/users/login")
    .send({ email: account.email, password: account.password });
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
    ["post", "/api/v1/invitations"],
    ["get", "/api/v1/invitations"],
    ["delete", "/api/v1/invitations/some-id"],
    ["get", "/api/v1/users/me"],
  ] as const)("API-02: %s %s requires a session", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe("auth endpoints", () => {
  it("AUTH-01: login sets HTTP-only cookies and never returns the password", async () => {
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

  it("AUTH-21: /me returns the token payload in { data }", async () => {
    const { jwt } = await signup();
    const res = await request(app).get("/api/v1/users/me").set("Cookie", jwt);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      email: account.email,
      username: account.username,
    });
  });

  it("AUTH-13: there is no public signup", async () => {
    const res = await request(app).post("/api/v1/users/signup").send(account);
    expect(res.status).toBe(404);
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

  it("SURV-02, SURV-03: the first activation locks the survey for good", async () => {
    const { jwt } = await signup();
    await createSurvey(jwt);
    const path = "/api/v1/surveys/employee-satisfaction-survey";

    const renamed = await request(app)
      .patch(path)
      .set("Cookie", jwt)
      .send({ name: "Employee survey v2" });
    expect(renamed.body.data).toMatchObject({ isLocked: false });
    const newPath = "/api/v1/surveys/employee-survey-v2";

    const activated = await request(app)
      .patch(newPath)
      .set("Cookie", jwt)
      .send({ isActive: true });
    expect(activated.body.data).toMatchObject({ isActive: true, isLocked: true });

    const deactivated = await request(app)
      .patch(newPath)
      .set("Cookie", jwt)
      .send({ isActive: false });
    expect(deactivated.body.data).toMatchObject({
      isActive: false,
      isLocked: true,
      activatedAt: null,
    });

    const edit = await request(app)
      .patch(newPath)
      .set("Cookie", jwt)
      .send({ name: "Another name" });
    expect(edit.status).toBe(400);
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

    expect(first.status).toBe(201);
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

  it("API-34: an answer id that is not a UUID is 422", async () => {
    const { jwt } = await activeSurvey();
    for (const method of ["get", "delete"] as const) {
      const res = await request(app)[method](`${answersPath}/not-a-uuid`).set("Cookie", jwt);
      expect(res.status).toBe(422);
      expect(res.body.errors).toEqual([{ field: "id", message: "Must be a valid UUID" }]);
    }
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

describe("invitation endpoints", () => {
  const invitee = "new.user@example.com";
  const newAccount = {
    username: "newuser",
    password: "password123",
    passwordConfirm: "password123",
  };

  async function invite(jwt: string, email = invitee) {
    return request(app).post("/api/v1/invitations").set("Cookie", jwt).send({ email });
  }

  it("AUTH-24, AUTH-27, AUTH-29: invite → check the link → create the account", async () => {
    const { jwt } = await signup();
    const created = await invite(jwt);
    expect(created.status).toBe(201);
    expect(created.body.data.invitation).toMatchObject({
      email: invitee,
      status: "pending",
      invitedBy: { username: account.username },
    });
    const { token } = created.body.data;

    const info = await request(app).get(`/api/v1/invitations/token/${token}`);
    expect(info.status).toBe(200);
    expect(info.body.data).toMatchObject({ email: invitee });

    const accepted = await request(app)
      .post(`/api/v1/invitations/token/${token}/accept`)
      .send(newAccount);
    expect(accepted.status).toBe(201);
    expect(accepted.body.data).toMatchObject({ email: invitee, username: "newuser" });
    expect(Object.keys(cookiesOf(accepted))).toEqual(
      expect.arrayContaining(["jwt", "refresh"]),
    );

    const login = await request(app)
      .post("/api/v1/users/login")
      .send({ email: invitee, password: newAccount.password });
    expect(login.status).toBe(200);

    const reused = await request(app)
      .post(`/api/v1/invitations/token/${token}/accept`)
      .send({ ...newAccount, username: "another" });
    expect(reused.status).toBe(404);
  });

  it("AUTH-24: inviting an existing user's email is 409", async () => {
    const { jwt } = await signup();
    expect((await invite(jwt, account.email)).status).toBe(409);
  });

  it("AUTH-24: a new invitation for the same email replaces the pending one", async () => {
    const { jwt } = await signup();
    const first = await invite(jwt);
    await invite(jwt);

    const old = await request(app).get(
      `/api/v1/invitations/token/${first.body.data.token}`,
    );
    expect(old.status).toBe(404);

    const list = await request(app).get("/api/v1/invitations").set("Cookie", jwt);
    expect(list.body.meta).toEqual({ results: 2 });
    expect(list.body.data.map((i: { status: string }) => i.status).sort()).toEqual([
      "pending",
      "revoked",
    ]);
    expect(JSON.stringify(list.body)).not.toMatch(/token/i);
  });

  it("AUTH-26: revoking a pending invitation, then again", async () => {
    const { jwt } = await signup();
    const created = await invite(jwt);
    const path = `/api/v1/invitations/${created.body.data.invitation.id}`;

    expect((await request(app).delete(path).set("Cookie", jwt)).status).toBe(204);
    expect((await request(app).delete(path).set("Cookie", jwt)).status).toBe(409);
    expect(
      (await request(app).get(`/api/v1/invitations/token/${created.body.data.token}`))
        .status,
    ).toBe(404);
  });

  it("AUTH-28: invalid account data → 422; taken username → 409", async () => {
    const { jwt } = await signup();
    const { token } = (await invite(jwt)).body.data;
    const accept = (body: object) =>
      request(app).post(`/api/v1/invitations/token/${token}/accept`).send(body);

    expect((await accept({ ...newAccount, passwordConfirm: "different" })).status).toBe(
      422,
    );
    expect((await accept({ ...newAccount, username: account.username })).status).toBe(409);
  });

  it("API-34: revoking an id that is not a UUID is 422", async () => {
    const { jwt } = await signup();
    const res = await request(app).delete("/api/v1/invitations/not-a-uuid").set("Cookie", jwt);
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual([{ field: "id", message: "Must be a valid UUID" }]);
  });

  it("AUTH-32: emails are handled in lowercase (invite, accept, login)", async () => {
    const { jwt } = await signup();
    expect((await invite(jwt, account.email.toUpperCase())).status).toBe(409);

    const { token, invitation } = (await invite(jwt, "New.User@Example.com")).body.data;
    expect(invitation.email).toBe(invitee);
    const accepted = await request(app)
      .post(`/api/v1/invitations/token/${token}/accept`)
      .send(newAccount);
    expect(accepted.body.data.email).toBe(invitee);

    const login = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "NEW.USER@EXAMPLE.COM", password: newAccount.password });
    expect(login.status).toBe(200);
  });

  it("AUTH-27: an unknown token is 404", async () => {
    const res = await request(app).get("/api/v1/invitations/token/unknown");
    expect(res.status).toBe(404);
    expect(res.body.detail).toBe("This invitation is invalid or has expired");
  });
});

