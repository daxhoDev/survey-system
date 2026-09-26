import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import app from "../../../src/app.js";

describe("rate limiting", () => {
  it("API-21, API-22: /users allows 20 requests per minute, then 429 problem with standard headers", async () => {
    const statuses: number[] = [];
    let last: request.Response | undefined;
    for (let i = 0; i < 21; i++) {
      last = await request(app).post("/api/v1/users/refresh");
      statuses.push(last.status);
    }

    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(last!.status).toBe(429);
    expect(last!.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(last!.body.title).toBe("Too many requests");
    expect(last!.headers).toHaveProperty("ratelimit-limit");
    expect(last!.headers).not.toHaveProperty("x-ratelimit-limit");
  });

  it.each([
    ["get", "/api/v1/invitations/token/some-token"],
    ["post", "/api/v1/invitations/token/some-token/accept"],
  ] as const)("AUTH-30: %s %s allows 20 requests per minute, then 429", async (method, path) => {
    // A fresh app, so the global limiter has not counted the other tests.
    vi.resetModules();
    const { default: freshApp } = await import("../../../src/app.js");
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      statuses.push((await request(freshApp)[method](path)).status);
    }

    expect(statuses.slice(0, 20).every((s) => s !== 429)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it("API-20: the global limiter allows 40 requests per minute on /api/", async () => {
    let last: request.Response | undefined;
    for (let i = 0; i < 41; i++) {
      last = await request(app).get("/api/v1/nope");
    }
    expect(last!.status).toBe(429);
  });
});
