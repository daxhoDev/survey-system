import { execSync } from "node:child_process";
import bcrypt from "bcrypt";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "../helpers/database.js";

const runSeed = (nodeEnv = "development") =>
  execSync("pnpm exec tsx prisma/seed.ts", {
    env: { ...process.env, NODE_ENV: nodeEnv, CORS_ORIGIN: "https://app.test" },
    stdio: "pipe",
  }).toString();

const counts = async () => ({
  users: await prisma.users.count(),
  surveys: await prisma.surveys.count(),
  answers: await prisma.answers.count(),
});

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("demo seed (DEV-WF-01)", () => {
  it("creates the demo user, three surveys and answers, and is idempotent", async () => {
    runSeed();
    const first = await counts();
    runSeed();

    expect(first).toEqual({ users: 1, surveys: 3, answers: 3 });
    expect(await counts()).toEqual(first);

    const user = await prisma.users.findFirstOrThrow({
      where: { email: "demo@example.com" },
    });
    await expect(bcrypt.compare("demo12345", user.password)).resolves.toBe(true);

    const states = await prisma.surveys.findMany({
      select: { slug: true, is_active: true, is_locked: true },
      orderBy: { slug: "asc" },
    });
    expect(states).toEqual([
      { slug: "office-relocation-survey", is_active: false, is_locked: true },
      { slug: "team-satisfaction-survey", is_active: true, is_locked: true },
      { slug: "training-needs-draft", is_active: false, is_locked: false },
    ]);
  });

  it("refuses to run with NODE_ENV=production", async () => {
    expect(() => runSeed("production")).toThrow();
    expect(await counts()).toEqual({ users: 0, surveys: 0, answers: 0 });
  });
});
