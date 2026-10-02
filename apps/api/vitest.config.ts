import "dotenv/config";
import { defineConfig } from "vitest/config";

// Configuration shared by every test run. Tests never read apps/api/.env
// values for anything but TEST_DATABASE_URL (see docs/sdd/30-dev-workflow.md).
const testEnv = {
  NODE_ENV: "development",
  LOG_LEVEL: "silent",
  JWT_SECRET: "test-secret-with-at-least-32-characters",
  ACCESS_TOKEN_TTL_MINUTES: "15",
  REFRESH_TOKEN_TTL_DAYS: "7",
  CORS_ORIGIN: "http://localhost:5173",
};

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  console.warn(
    "TEST_DATABASE_URL is not set: skipping the database tests (tests/db).",
  );
}

export default defineConfig({
  test: {
    // The db project has no files when TEST_DATABASE_URL is unset.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**", "src/types/**"],
    },
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          env: {
            ...testEnv,
            DATABASE_URL: "postgresql://unused:unused@localhost:1/unused",
          },
        },
      },
      {
        test: {
          name: "db",
          include: testDatabaseUrl ? ["tests/db/**/*.test.ts"] : [],
          env: {
            ...testEnv,
            DATABASE_URL: testDatabaseUrl ?? "",
          },
          globalSetup: ["tests/db/globalSetup.ts"],
          // Tests share one database: run files one after another.
          fileParallelism: false,
        },
      },
    ],
  },
});
