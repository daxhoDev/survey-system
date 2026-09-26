import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../src/app.js";
import RefreshTokenRepository from "../../src/repositories/refreshTokenRepository.js";
import UserRepository from "../../src/repositories/userRepository.js";
import AuthService from "../../src/services/authService.js";
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
});
