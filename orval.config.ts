import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "http://localhost:3000/api/v1/docs-raw",
    output: {
      mode: "tags-split",
      target: "./apps/web/src/lib/api",
      client: "react-query",
      httpClient: "fetch",
      // Paths are relative; customInstance prefixes VITE_API_URL (CFG-09).
      override: {
        mutator: {
          path: "./apps/web/src/lib/api/mutator/customInstance.ts",
          name: "customInstance",
        },
        // customInstance returns the response body, so types are the body (FE-11).
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
