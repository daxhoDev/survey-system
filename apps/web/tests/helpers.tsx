import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { vi } from "vitest";

type Reply = { status: number; body?: unknown };
type Handler = (url: string, init: RequestInit) => Reply;

// Replaces global fetch with a router of `METHOD path` → handler.
export function mockFetch(routes: Record<string, Handler | Reply>) {
  const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = String(input);
    const path = new URL(url, "http://localhost").pathname;
    const key = `${init.method ?? "GET"} ${path}`;
    const route = routes[key];
    if (!route) throw new Error(`Unexpected request: ${key}`);
    const reply = typeof route === "function" ? route(url, init) : route;
    return new Response(
      reply.body === undefined ? null : JSON.stringify(reply.body),
      { status: reply.status, headers: { "Content-Type": "application/json" } },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function renderWithProviders(
  ui: ReactNode,
  { path = "/", route = "/" }: { path?: string; route?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<p>other page</p>} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  );
}
