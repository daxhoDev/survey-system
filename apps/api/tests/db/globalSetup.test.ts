import { v7 } from "uuid";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import setup from "./globalSetup.js";
import { prisma, resetDatabase } from "../helpers/database.js";
import { questions } from "../helpers/fixtures.js";

// Runs the db project's global setup and teardown against the real test
// database (REQ-DEVWF-002). Inside the db project DATABASE_URL equals
// TEST_DATABASE_URL, so it is stubbed to a different URL for the safety check.

const counts = async () => ({
  users: await prisma.users.count(),
  surveys: await prisma.surveys.count(),
  answers: await prisma.answers.count(),
  invitations: await prisma.invitations.count(),
  refreshTokens: await prisma.refresh_tokens.count(),
});

const empty = { users: 0, surveys: 0, answers: 0, invitations: 0, refreshTokens: 0 };

const migrationRows = async () =>
  Number(
    (await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      "SELECT count(*) AS n FROM _prisma_migrations",
    ))[0]!.n,
  );

// One row in every application table, as an earlier run could leave behind.
async function insertLeftovers() {
  const userId = v7();
  const surveyId = v7();
  await prisma.users.create({
    data: { id: userId, username: "leftover", email: "leftover@example.com", password: "x" },
  });
  await prisma.refresh_tokens.create({
    data: { id: v7(), user_id: userId, token_hash: v7(), expires_at: new Date(Date.now() + 60_000) },
  });
  await prisma.invitations.create({
    data: {
      id: v7(),
      email: "invited@example.com",
      token_hash: v7(),
      invited_by: userId,
      expires_at: new Date(Date.now() + 60_000),
    },
  });
  await prisma.surveys.create({
    data: { id: surveyId, name: "Leftover", slug: "leftover", questions: questions as never },
  });
  await prisma.answers.create({
    data: { id: v7(), survey_id: surveyId, responses: [], origin_ip: "10.0.0.1" },
  });
  expect(await counts()).toEqual({ users: 1, surveys: 1, answers: 1, invitations: 1, refreshTokens: 1 });
}

beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/survey_system");
});
afterEach(() => {
  vi.unstubAllEnvs();
});
afterAll(() => prisma.$disconnect());

describe("db global setup against the test database (REQ-DEVWF-002)", () => {
  it("AC-DEVWF-002-6: removes rows left by an earlier run and keeps _prisma_migrations", async () => {
    const migrations = await migrationRows();
    expect(migrations).toBeGreaterThan(0);
    await insertLeftovers();

    await setup();

    expect(await counts()).toEqual(empty);
    expect(await migrationRows()).toBe(migrations);
  }, 60_000);

  it("AC-DEVWF-002-6: its teardown leaves every application table empty and keeps _prisma_migrations", async () => {
    const migrations = await migrationRows();
    const teardown = await setup();
    await insertLeftovers();

    await teardown!();

    expect(await counts()).toEqual(empty);
    expect(await migrationRows()).toBe(migrations);
  }, 60_000);
});
