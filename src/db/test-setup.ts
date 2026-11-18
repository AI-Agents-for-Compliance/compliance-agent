import { runMigrations } from "./migrate";
import postgres from "postgres";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://dev:dev@localhost:5432/compliance_test";

/** Vitest globalSetup: frisches Schema in der Test-DB, dann migrieren. */
export default async function setup() {
  const sql = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  } finally {
    await sql.end();
  }
  await runMigrations(TEST_DATABASE_URL);
}
