import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEnv(vars: Record<string, string | boolean | undefined>) {
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value as string);
  vi.resetModules();
  return (await import("@/config/env")).env;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("web config (CFG-09)", () => {
  it("defaults to http://localhost:3000 outside production", async () => {
    await expect(loadEnv({ VITE_API_URL: undefined })).resolves.toEqual({
      API_URL: "http://localhost:3000",
    });
  });

  it("uses VITE_API_URL without a trailing slash", async () => {
    await expect(
      loadEnv({ VITE_API_URL: "https://api.example.com/" }),
    ).resolves.toEqual({ API_URL: "https://api.example.com" });
  });

  it("rejects a VITE_API_URL that is not a URL", async () => {
    await expect(loadEnv({ VITE_API_URL: "not a url" })).rejects.toThrow(
      "VITE_API_URL must be a URL",
    );
  });

  it("requires VITE_API_URL in a production build", async () => {
    await expect(loadEnv({ VITE_API_URL: undefined, PROD: true })).rejects.toThrow(
      "VITE_API_URL is required in production builds",
    );
  });
});
