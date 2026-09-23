import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const valid = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  NODE_ENV: "development",
  JWT_SECRET: "0123456789abcdef0123456789abcdef",
  ACCESS_TOKEN_TTL_MINUTES: "15",
  REFRESH_TOKEN_TTL_DAYS: "7",
  CORS_ORIGIN: undefined,
  LOG_LEVEL: undefined,
  PORT: undefined,
};

let exit: ReturnType<typeof vi.spyOn>;
let stderr: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new Error(`exit ${code}`);
  }) as never);
  stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function loadEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries({ ...valid, ...vars })) {
    vi.stubEnv(key, value);
  }
  vi.resetModules();
  return (await import("../../../src/config/env.js")).env;
}

const printed = () => stderr.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");

describe("config/env", () => {
  it("parses a valid configuration and applies the defaults (CFG-03)", async () => {
    const env = await loadEnv({});

    expect(env).toMatchObject({
      PORT: 3000,
      NODE_ENV: "development",
      ACCESS_TOKEN_TTL_MINUTES: 15,
      REFRESH_TOKEN_TTL_DAYS: 7,
      LOG_LEVEL: "info",
      CORS_ORIGIN: "http://localhost:5173",
    });
  });

  it("CFG-02: lists every issue, never the values, and exits with 1", async () => {
    await expect(
      loadEnv({
        NODE_ENV: "test",
        JWT_SECRET: "short-secret-value",
        ACCESS_TOKEN_TTL_MINUTES: "abc",
      }),
    ).rejects.toThrow("exit 1");

    const output = printed();
    expect(output).toContain("NODE_ENV");
    expect(output).toContain("JWT_SECRET");
    expect(output).toContain("ACCESS_TOKEN_TTL_MINUTES");
    expect(output).not.toContain("short-secret-value");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("CFG-04: NODE_ENV only accepts development or production", async () => {
    await expect(loadEnv({ NODE_ENV: "staging" })).rejects.toThrow("exit 1");
    await expect(loadEnv({ NODE_ENV: "production", CORS_ORIGIN: "https://a.test" }))
      .resolves.toMatchObject({ NODE_ENV: "production" });
  });

  it("CFG-06: CORS_ORIGIN is required in production", async () => {
    await expect(loadEnv({ NODE_ENV: "production" })).rejects.toThrow("exit 1");
    expect(printed()).toContain("CORS_ORIGIN: Required in production");
  });
});
