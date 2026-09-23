import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../src/app.js";
import { questions } from "../helpers/fixtures.js";
import { prisma, resetDatabase } from "../helpers/database.js";

// Rate limits are covered in tests/unit/http/rateLimit.test.ts.
vi.mock("../../src/utils/limiter.js", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("full flow against PostgreSQL", () => {
  it("signup → create → activate → answer → stats → delete", async () => {
    const signup = await request(app).post("/api/v1/users/signup").send({
      email: "owner@example.com",
      username: "owner",
      password: "password123",
      passwordConfirm: "password123",
    });
    expect(signup.status).toBe(200);
    const jwt = (signup.headers["set-cookie"] as unknown as string[])
      .find((c) => c.startsWith("jwt="))!
      .split(";")[0]!;

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
    await request(app).post("/api/v1/users/signup").send({
      email: "owner@example.com",
      username: "owner",
      password: "password123",
      passwordConfirm: "password123",
    });
    const unknown = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "nobody@example.com", password: "password123" });
    const wrong = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "owner@example.com", password: "wrong-password" });

    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });
});
