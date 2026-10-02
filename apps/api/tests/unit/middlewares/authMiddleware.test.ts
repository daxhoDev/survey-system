import cookieParser from "cookie-parser";
import express, { type Response } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import AuthMiddleware from "../../../src/middlewares/authMiddleware.js";
import { ErrorMiddleware } from "../../../src/middlewares/errorMiddleware.js";
import type { ProtectedRequest } from "../../../src/types.js";
import { user } from "../../helpers/fixtures.js";

const secret = process.env.JWT_SECRET as string;
const tokens = {
  valid: jwt.sign(user, secret, { expiresIn: "5m" }),
  expired: jwt.sign({ ...user, exp: Math.floor(Date.now() / 1000) - 60 }, secret),
  badSignature: jwt.sign(user, "another-secret-with-at-least-32-chars"),
  garbage: "not-a-jwt",
};

function buildApp(middleware: "protect" | "optionalAuth") {
  const auth = new AuthMiddleware();
  const app = express();
  app.use(cookieParser());
  app.get("/", auth[middleware].bind(auth), (req: ProtectedRequest, res: Response) => {
    res.json({ user: req.user ?? null, sessionExpired: req.sessionExpired ?? false });
  });
  app.use(new ErrorMiddleware().handleGlobalError);
  return app;
}

const get = (app: express.Express, token?: string) => {
  const req = request(app).get("/");
  return token ? req.set("Cookie", `jwt=${token}`) : req;
};

describe("AuthMiddleware.protect", () => {
  const app = buildApp("protect");

  it("AUTH-06: 401 without the jwt cookie", async () => {
    const res = await get(app);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      title: "Unauthenticated user",
      detail: "Please, log in first",
    });
  });

  it("AUTH-07: 401 Token Error for an expired token", async () => {
    const res = await get(app, tokens.expired);
    expect(res.status).toBe(401);
    expect(res.body.title).toBe("Token Error");
  });

  it.each([
    ["not a JWT", tokens.garbage],
    ["signed with another secret", tokens.badSignature],
  ])("AUTH-08: 401 Invalid token and cleared cookies for a token %s", async (_label, token) => {
    const res = await get(app, token);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      title: "Invalid token",
      detail: "Please, log in again",
    });
    const cookies = (res.headers["set-cookie"] as unknown as string[]).join("\n");
    expect(cookies).toMatch(/jwt=;.*Expires=Thu, 01 Jan 1970/);
    expect(cookies).toMatch(/refresh=;.*Path=\/api\/v1\/users\/refresh.*Expires=Thu, 01 Jan 1970/);
  });

  it("AUTH-09: sets req.user from the token payload", async () => {
    const res = await get(app, tokens.valid);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(user);
  });

  it("AUTH-05: ignores the Authorization header", async () => {
    const res = await request(app)
      .get("/")
      .set("Authorization", `Bearer ${tokens.valid}`);
    expect(res.status).toBe(401);
  });
});

describe("AuthMiddleware.optionalAuth (AUTH-22)", () => {
  const app = buildApp("optionalAuth");
  const cases: [string, string | undefined, object][] = [
    ["no cookie", undefined, { user: null, sessionExpired: false }],
    ["a valid token", tokens.valid, { user, sessionExpired: false }],
    ["an expired token", tokens.expired, { user: null, sessionExpired: true }],
    ["a bad signature", tokens.badSignature, { user: null, sessionExpired: false }],
    ["a malformed token", tokens.garbage, { user: null, sessionExpired: false }],
  ];

  it.each(cases)("never fails, with %s", async (_label, token, expected) => {
    const res = await get(app, token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expected);
  });
});
