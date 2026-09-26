import { spawnSync } from "node:child_process";
import bcrypt from "bcrypt";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "../helpers/database.js";

// Answers are piped: email, username, password, password confirmation.
const runCreateUser = (...answers: string[]) =>
  spawnSync("pnpm", ["exec", "tsx", "src/scripts/createUser.ts"], {
    env: process.env,
    input: answers.map((a) => `${a}\n`).join(""),
    encoding: "utf8",
  });

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("create-user command (AUTH-31)", () => {
  it("creates the account with a bcrypt hash and prints it", async () => {
    const run = runCreateUser("owner@example.com", "owner", "password123", "password123");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("User created: owner <owner@example.com>");
    expect(run.stdout).not.toContain("password123");
    const user = await prisma.users.findFirstOrThrow({
      where: { email: "owner@example.com" },
    });
    expect(user.username).toBe("owner");
    await expect(bcrypt.compare("password123", user.password)).resolves.toBe(true);
  });

  it("AUTH-10: refuses an email that is already used", async () => {
    runCreateUser("owner@example.com", "owner", "password123", "password123");
    const run = runCreateUser("owner@example.com", "other", "password123", "password123");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("There is already an user with this email");
    expect(await prisma.users.count()).toBe(1);
  });

  it("AUTH-11: reports validation errors and creates nothing", async () => {
    const run = runCreateUser("not-an-email", "ab", "password123", "different");

    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/email: /);
    expect(run.stderr).toMatch(/username: /);
    expect(await prisma.users.count()).toBe(0);
  });
});
