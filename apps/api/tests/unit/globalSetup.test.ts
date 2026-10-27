import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Unit tests of the db project's global setup (REQ-DEVWF-002): the migration
// command and the database client are faked, so no database is touched.

const { execSync, queries, clients } = vi.hoisted(() => ({
  execSync: vi.fn(),
  queries: [] as string[],
  clients: [] as { connectionString: string; ended: boolean }[],
}));

vi.mock("node:child_process", () => ({ execSync }));

vi.mock("pg", () => {
  class Client {
    state: { connectionString: string; ended: boolean };
    constructor({ connectionString }: { connectionString: string }) {
      this.state = { connectionString, ended: false };
      clients.push(this.state);
    }
    async connect() {}
    async query(sql: string) {
      queries.push(sql.replace(/\s+/g, " ").trim());
      if (sql.includes("pg_tables")) {
        // The real query filters _prisma_migrations out in SQL.
        return { rows: [{ tablename: "answers" }, { tablename: "users" }] };
      }
      return { rows: [] };
    }
    escapeIdentifier(name: string) {
      return `"${name}"`;
    }
    async end() {
      this.state.ended = true;
    }
  }
  return { default: { Client } };
});

const TEST_URL = "postgresql://postgres:postgres@localhost:5432/survey_system_test";
const DEV_URL = "postgresql://postgres:postgres@localhost:5432/survey_system";

async function runSetup(vars: { TEST_DATABASE_URL?: string; DATABASE_URL?: string }) {
  vi.stubEnv("TEST_DATABASE_URL", vars.TEST_DATABASE_URL);
  vi.stubEnv("DATABASE_URL", vars.DATABASE_URL);
  const { default: setup } = await import("../db/globalSetup.js");
  return setup();
}

const truncates = () => queries.filter((q) => q.startsWith("TRUNCATE"));

beforeEach(() => {
  execSync.mockReset();
  queries.length = 0;
  clients.length = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("db global setup (REQ-DEVWF-002)", () => {
  it("AC-DEVWF-002-1: does nothing without TEST_DATABASE_URL", async () => {
    const teardown = await runSetup({ DATABASE_URL: DEV_URL });

    expect(teardown).toBeUndefined();
    expect(execSync).not.toHaveBeenCalled();
    expect(clients).toHaveLength(0);
  });

  it("AC-DEVWF-002-2: refuses a database whose name does not contain 'test'", async () => {
    await expect(
      runSetup({ TEST_DATABASE_URL: DEV_URL, DATABASE_URL: "postgresql://x@localhost/other" }),
    ).rejects.toThrow(/test database/);

    expect(execSync).not.toHaveBeenCalled();
    expect(clients).toHaveLength(0);
  });

  it("AC-DEVWF-002-2: refuses a TEST_DATABASE_URL equal to DATABASE_URL", async () => {
    await expect(
      runSetup({ TEST_DATABASE_URL: TEST_URL, DATABASE_URL: TEST_URL }),
    ).rejects.toThrow(/must differ from DATABASE_URL/);

    expect(execSync).not.toHaveBeenCalled();
    expect(clients).toHaveLength(0);
  });

  it("AC-DEVWF-002-3: applies migrations with migrate deploy against the test database, never migrate reset", async () => {
    await runSetup({ TEST_DATABASE_URL: TEST_URL, DATABASE_URL: DEV_URL });

    expect(execSync).toHaveBeenCalledTimes(1);
    const [command, options] = execSync.mock.calls[0] as [string, { env: NodeJS.ProcessEnv }];
    expect(command).toMatch(/\bprisma migrate deploy\b/);
    expect(command).not.toMatch(/reset/);
    expect(options.env.DATABASE_URL).toBe(TEST_URL);
  });

  it("AC-DEVWF-002-3, AC-DEVWF-002-6: empties every application table after migrating, keeping _prisma_migrations", async () => {
    execSync.mockImplementation(() => {
      expect(truncates()).toHaveLength(0);
      return Buffer.from("");
    });

    await runSetup({ TEST_DATABASE_URL: TEST_URL, DATABASE_URL: DEV_URL });

    const listing = queries.find((q) => q.includes("pg_tables"));
    expect(listing).toMatch(/schemaname = current_schema\(\)/);
    expect(listing).toMatch(/tablename <> '_prisma_migrations'/);
    expect(truncates()).toEqual(['TRUNCATE TABLE "answers", "users" CASCADE']);
    expect(clients.map((c) => c.connectionString)).toEqual([TEST_URL]);
    expect(clients.every((c) => c.ended)).toBe(true);
  });

  it("AC-DEVWF-002-6: returns a teardown that empties every application table again", async () => {
    const teardown = await runSetup({ TEST_DATABASE_URL: TEST_URL, DATABASE_URL: DEV_URL });
    expect(typeof teardown).toBe("function");
    queries.length = 0;

    await teardown!();

    expect(truncates()).toEqual(['TRUNCATE TABLE "answers", "users" CASCADE']);
    expect(clients.at(-1)).toEqual({ connectionString: TEST_URL, ended: true });
  });

  it("AC-DEVWF-002-3: fails with the migration output and empties nothing when migrate deploy fails", async () => {
    execSync.mockImplementation(() => {
      throw Object.assign(new Error("failed"), {
        stdout: Buffer.from("migration log"),
        stderr: Buffer.from("P3009 failed migration"),
      });
    });

    await expect(
      runSetup({ TEST_DATABASE_URL: TEST_URL, DATABASE_URL: DEV_URL }),
    ).rejects.toThrow(/Could not apply the migrations[\s\S]*migration log[\s\S]*P3009/);
    expect(clients).toHaveLength(0);
  });
});

describe("db project configuration (REQ-DEVWF-002)", () => {
  it("AC-DEVWF-002-3: uses the global setup and runs its files one at a time", async () => {
    const { default: config } = await import("../../vitest.config.js");
    const db = (config.test?.projects as { test: Record<string, unknown> }[]).find(
      (project) => project.test.name === "db",
    );

    expect(db?.test.globalSetup).toEqual(["tests/db/globalSetup.ts"]);
    expect(db?.test.fileParallelism).toBe(false);
  });
});
