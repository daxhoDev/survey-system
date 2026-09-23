import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import z from "zod";
import AppError from "../../../src/utils/appError.js";

// The handler reads NODE_ENV from the validated config, so each environment
// needs a fresh module graph.
async function buildApp(nodeEnv: "development" | "production") {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  const { ErrorMiddleware } = await import(
    "../../../src/middlewares/errorMiddleware.js"
  );
  const { default: AppErrorClass } = await import(
    "../../../src/utils/appError.js"
  );

  const app = express();
  app.get("/operational", () => {
    throw new AppErrorClass("Not found", "The thing doesn't exist", 404);
  });
  app.get("/zod", () => {
    throw z.object({ name: z.string() }).safeParse({}).error;
  });
  app.get("/crash", () => {
    throw new Error("secret internals");
  });
  app.use(new ErrorMiddleware().handleGlobalError);
  return app;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ErrorMiddleware", () => {
  it("API-09: errors are application/problem+json with type, status, title and detail", async () => {
    const app = await buildApp("production");
    const res = await request(app).get("/operational");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(res.body).toEqual({
      type: "about:blank",
      status: 404,
      title: "Not found",
      detail: "The thing doesn't exist",
    });
  });

  it("API-11: a ZodError becomes 422 Validation Error with the field errors", async () => {
    const app = await buildApp("production");
    const res = await request(app).get("/zod");

    expect(res.status).toBe(422);
    expect(res.body.title).toBe("Validation Error");
    expect(res.body.errors).toEqual([
      expect.objectContaining({ field: "name" }),
    ]);
  });

  it("API-14: in production a non-operational error is a single generic 500", async () => {
    const app = await buildApp("production");
    const res = await request(app).get("/crash");

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      status: 500,
      title: "Unexpected error",
      detail: "Something went wrong",
    });
    expect(JSON.stringify(res.body)).not.toContain("secret internals");
  });

  it("API-13: in development the response also includes error and stack", async () => {
    const app = await buildApp("development");
    const res = await request(app).get("/operational");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("stack");
    expect(res.body).toHaveProperty("error");
  });

  it("API-10: AppError is operational", () => {
    expect(new AppError("t", "d", 400).isOperational).toBe(true);
  });
});
