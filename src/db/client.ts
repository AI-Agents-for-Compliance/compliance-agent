import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const DEFAULT_DATABASE_URL = "postgresql://dev:dev@localhost:5432/compliance";

export function createDb(url: string = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL) {
  const sql = postgres(url, { max: Number(process.env.DB_POOL_MAX ?? 5), onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}

export type Db = ReturnType<typeof createDb>["db"];
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

let shared: ReturnType<typeof createDb> | undefined;
export function getDb(): Db {
  shared ??= createDb();
  return shared.db;
}

export async function closeDb(): Promise<void> {
  const s = shared;
  shared = undefined;
  await s?.sql.end();
}
