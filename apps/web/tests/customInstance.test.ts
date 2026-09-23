import { describe, expect, it } from "vitest";
import { customInstance } from "@/lib/api/mutator/customInstance";
import { mockFetch } from "./helpers";

const url = "http://localhost:3000/api/v1/surveys/some-survey";
const refresh = "POST /api/v1/users/refresh";
const unauthorized = { status: 401, body: { status: 401, title: "Token Error" } };

describe("customInstance (FE-09)", () => {
  it("returns the parsed body on success and null on 204", async () => {
    mockFetch({
      "GET /api/v1/surveys/some-survey": { status: 200, body: { data: 1 } },
      "DELETE /api/v1/surveys/some-survey": { status: 204 },
    });

    await expect(customInstance(url, { method: "GET" })).resolves.toEqual({ data: 1 });
    await expect(customInstance(url, { method: "DELETE" })).resolves.toBeNull();
  });

  it("sends cookies with every request", async () => {
    const fetchMock = mockFetch({
      "GET /api/v1/surveys/some-survey": { status: 200, body: {} },
    });
    await customInstance(url, { method: "GET" });

    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ credentials: "include" });
  });

  it("on 401 refreshes the session silently and retries once", async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      "GET /api/v1/surveys/some-survey": () =>
        ++calls === 1 ? unauthorized : { status: 200, body: { data: "ok" } },
      [refresh]: { status: 204 },
    });

    await expect(customInstance(url, { method: "GET" })).resolves.toEqual({
      data: "ok",
    });
    expect(fetchMock.mock.calls.map((c) => c[1]?.method ?? "GET")).toEqual([
      "GET",
      "POST",
      "GET",
    ]);
  });

  it("throws the original error when the refresh fails", async () => {
    mockFetch({
      "GET /api/v1/surveys/some-survey": unauthorized,
      [refresh]: { status: 401, body: { title: "Invalid token" } },
    });

    await expect(customInstance(url, { method: "GET" })).rejects.toEqual(
      unauthorized.body,
    );
  });

  it("shares one refresh between concurrent 401 responses", async () => {
    const seen = new Set<string>();
    const fetchMock = mockFetch({
      "GET /api/v1/surveys/a": (u) =>
        seen.has(u) ? { status: 200, body: "a" } : (seen.add(u), unauthorized),
      "GET /api/v1/surveys/b": (u) =>
        seen.has(u) ? { status: 200, body: "b" } : (seen.add(u), unauthorized),
      [refresh]: { status: 204 },
    });

    await Promise.all([
      customInstance("http://localhost:3000/api/v1/surveys/a", { method: "GET" }),
      customInstance("http://localhost:3000/api/v1/surveys/b", { method: "GET" }),
    ]);

    const refreshes = fetchMock.mock.calls.filter((c) =>
      String(c[0]).endsWith("/users/refresh"),
    );
    expect(refreshes).toHaveLength(1);
  });

  it("does not try to refresh when the refresh call itself fails", async () => {
    const fetchMock = mockFetch({ [refresh]: unauthorized });

    await expect(
      customInstance("http://localhost:3000/api/v1/users/refresh", { method: "POST" }),
    ).rejects.toEqual(unauthorized.body);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
