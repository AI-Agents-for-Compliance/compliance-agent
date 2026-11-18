import type { PgBoss } from "pg-boss";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_DATABASE_URL } from "../db/test-setup";
import { enqueueCollection, startBoss } from "./boss";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
let boss: PgBoss;
beforeAll(async () => {
  // Frischer Zustand: Schema der vorigen Läufe entfernen.
  const owner = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await owner.unsafe("DROP SCHEMA IF EXISTS pgboss_test CASCADE");
  } finally {
    await owner.end();
  }
  boss = await startBoss(TEST_DATABASE_URL, "pgboss_test");
});
afterAll(async () => {
  await boss.stop({ graceful: false });
});

describe("enqueueCollection", () => {
  it("zweites Einreihen für denselben Mandanten wird verworfen", async () => {
    const erster = await enqueueCollection(A);
    const zweiter = await enqueueCollection(A);
    expect(erster).not.toBeNull();
    expect(zweiter).toBeNull();
    expect(await enqueueCollection(B)).not.toBeNull();
  });
});
