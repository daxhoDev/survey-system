import { execSync } from "node:child_process";

// Rebuilds the test database from the migrations once per run. Refuses to
// touch anything whose name does not look like a test database.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;

  const database = new URL(url).pathname.slice(1);
  if (!database.includes("test")) {
    throw new Error(
      `TEST_DATABASE_URL must point to a test database (got "${database}")`,
    );
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL");
  }

  try {
    execSync("pnpm exec prisma migrate reset --force", {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    throw new Error(`Could not rebuild the test database:\n${stderr}`);
  }
}
