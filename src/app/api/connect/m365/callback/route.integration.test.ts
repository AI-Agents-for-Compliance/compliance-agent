import postgres from "postgres";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { signState } from "@/connect/state";
import { closeDb } from "@/db/client";
import { resetTenants } from "@/db/helpers.test-util";
import { TEST_DATABASE_URL } from "@/db/test-setup";
import { COLLECT_JOB } from "@/jobs/collect-job";
import { stopSendBoss } from "@/jobs/boss";
import { GET } from "./route";

// Bewusst OHNE Mock von @/jobs/boss: prüft, dass der Web-Prozess selbst einreihen kann.
const SCHEMA = "pgboss_callback_test";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const MS = "33333333-3333-4333-8333-333333333333";

beforeAll(async () => {
  const owner = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await owner.unsafe(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  } finally {
    await owner.end();
  }
});
beforeEach(async () => {
  vi.stubEnv("PGBOSS_SCHEMA", SCHEMA);
  vi.stubEnv("CONNECT_STATE_SECRET", "s".repeat(40));
  vi.stubEnv("APP_URL", "https://app.example.test");
  await resetTenants(A, B);
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await stopSendBoss();
  await closeDb();
});

describe("Callback reiht im Web-Prozess ohne Worker ein", () => {
  it("legt einen COLLECT_JOB mit singletonKey = Mandant an", async () => {
    const res = await GET(new Request(
      `http://localhost/api/connect/m365/callback?admin_consent=true&tenant=${MS}&state=${signState(A)}`));
    expect(res.status).toBe(302);
    const owner = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
    try {
      const jobs = await owner.unsafe(
        `SELECT name, singleton_key FROM ${SCHEMA}.job WHERE name = $1`, [COLLECT_JOB]);
      expect(jobs.map((j) => j.singleton_key)).toEqual([A]);
    } finally {
      await owner.end();
    }
  });
});
