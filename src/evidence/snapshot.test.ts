import { afterAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { closeDb } from "../db/client";
import { withTenant } from "../db/tenant";
import { evidenceSnapshots } from "../db/schema";
import { TEST_DATABASE_URL } from "../db/test-setup";
import { fehlermeldung, resetTenants } from "../db/helpers.test-util";
import { canonicalHash, storeSnapshot } from "./snapshot";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => resetTenants(A, B));
afterAll(closeDb);

/** Liest als Eigentümer, nachdem die withTenant-Transaktion beendet ist (DB_POOL_MAX=1). */
async function rawSelectSnapshot(id: string) {
  const owner = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    const rows = await owner`SELECT * FROM evidence_snapshots WHERE id = ${id}`;
    return rows[0] as { sha256: string; tenant_id: string; source: string; key: string; status: string };
  } finally {
    await owner.end();
  }
}

describe("canonicalHash", () => {
  it("Hash ist unabhängig von der Schlüsselreihenfolge", () =>
    expect(canonicalHash({ a: 1, b: [2, { c: 3, d: 4 }] })).toBe(
      canonicalHash({ b: [2, { d: 4, c: 3 }], a: 1 }),
    ));
  it("Arrayreihenfolge zählt", () => expect(canonicalHash([1, 2])).not.toBe(canonicalHash([2, 1])));
  it("undefined-Werte in Objekten werden verworfen (wie JSON.stringify)", () =>
    expect(canonicalHash({ a: 1, b: undefined })).toBe(canonicalHash({ a: 1 })));
});

describe("storeSnapshot", () => {
  it("speichert Snapshot mit Hash und Zeitstempel", async () => {
    const s = await withTenant(A, (tx) =>
      storeSnapshot(tx, { key: "m365.users", status: "ok", payload: { value: [] }, source: "m365" }),
    );
    expect(s.snapshotId).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.collectedAt).toBeInstanceOf(Date);
    expect(s.data).toEqual({ value: [] });
    const row = await rawSelectSnapshot(s.snapshotId);
    expect(row.sha256).toBe(canonicalHash({ value: [] }));
    expect(row.tenant_id).toBe(A);
  });

  it("erzeugt bei jedem Aufruf einen neuen Snapshot", async () => {
    const p = { key: "m365.users", status: "ok", payload: { v: 1 }, source: "m365" } as const;
    const [x, y] = await withTenant(A, async (tx) => [await storeSnapshot(tx, p), await storeSnapshot(tx, p)]);
    expect(x.snapshotId).not.toBe(y.snapshotId);
  });

  it("Snapshot ist unveränderlich", async () => {
    const s = await withTenant(A, (tx) =>
      storeSnapshot(tx, { key: "m365.users", status: "ok", payload: {}, source: "m365" }),
    );
    expect(
      await fehlermeldung(withTenant(A, (tx) => tx.update(evidenceSnapshots).set({ status: "error" }))),
    ).toMatch(/unveränderlich/);
    expect((await rawSelectSnapshot(s.snapshotId)).status).toBe("ok");
  });
});
