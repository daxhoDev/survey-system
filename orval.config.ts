import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "http://localhost:3000/api/v1/docs-raw",
    output: {
      mode: "tags-split",
      target: "./apps/web/src/lib/api",
      client: "react-query",
      httpClient: "fetch",
      baseUrl: "http://localhost:3000",
      override: {
        mutator: {
          path: "./apps/web/src/lib/api/mutator/customInstance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
