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
    return rows[0] as { sha256: string; payload: unknown; tenant_id: string; source: string; key: string; status: string };
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

describe("canonicalHash (weitere Fälle)", () => {
  it("Date wird wie in JSON.stringify als ISO-String behandelt", () => {
    expect(canonicalHash({ d: new Date(0) })).toBe(canonicalHash({ d: "1970-01-01T00:00:00.000Z" }));
    expect(canonicalHash({ d: new Date(0) })).not.toBe(canonicalHash({ d: new Date(1000) }));
  });
  it("Arrays von Objekten werden rekursiv kanonisiert", () =>
    expect(canonicalHash({ l: [{ b: 1, a: 2 }, { d: 3, c: 4 }] })).toBe(
      canonicalHash({ l: [{ a: 2, b: 1 }, { c: 4, d: 3 }] }),
    ));
});

describe("storeSnapshot", () => {
  it("Hash passt zum gespeicherten jsonb (Round-Trip)", async () => {
    const payload = { z: [{ b: 1, a: { y: 2, x: [3, { q: 1, p: 2 }] } }], a: "x", d: new Date(0) };
    const s = await withTenant(A, (tx) => storeSnapshot(tx, { key: "m365.users", status: "ok", payload, source: "m365" }));
    const row = await rawSelectSnapshot(s.snapshotId);
    expect(canonicalHash(row.payload)).toBe(row.sha256);
  });

  it("lehnt leere Payloads (undefined/null) ab", async () => {
    for (const payload of [undefined, null]) {
      await expect(
        withTenant(A, (tx) => storeSnapshot(tx, { key: "m365.users", status: "error", payload, source: "m365" })),
      ).rejects.toThrow("Nachweis-Payload darf nicht leer sein");
    }
  });

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
