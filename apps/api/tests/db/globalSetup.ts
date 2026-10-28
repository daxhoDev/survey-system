import { execSync } from "node:child_process";
import pg from "pg";

// Brings the test database up to date with the migrations and empties every
// application table before the run, then empties them again when the run
// ends, so the test database is left empty. The database is never dropped or
// reset. Refuses to touch anything whose name does not look like a test
// database.
export default async function setup() {
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
    execSync("pnpm exec prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });
  } catch (error) {
    const output = error as { stdout?: Buffer; stderr?: Buffer };
    const details = [output.stdout, output.stderr]
      .map((buffer) => buffer?.toString() ?? "")
      .join("\n")
      .trim();
    throw new Error(
      `Could not apply the migrations to the test database:\n${details}`,
    );
  }

  await truncateApplicationTables(url);

  return async function teardown() {
    await truncateApplicationTables(url);
  };
}

// Empties every table of the current schema except Prisma's migration
// history, which keeps its rows.
async function truncateApplicationTables(url: string) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`,
    );
    if (rows.length === 0) return;
    const tables = rows
      .map(({ tablename }) => client.escapeIdentifier(tablename))
      .join(", ");
    await client.query(`TRUNCATE TABLE ${tables} CASCADE`);
  } finally {
    await client.end();
  }
}
