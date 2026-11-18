import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb } from "./client";
import { recordAudit } from "./audit";
import { withTenant } from "./tenant";
import { auditEvents, evidenceSnapshots } from "./schema";
import { fehlermeldung, resetTenants } from "./helpers.test-util";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => resetTenants(A, B));
afterAll(closeDb);

describe("Prüfpfad", () => {
  it("recordAudit schreibt Ereignis für den aktuellen Mandanten", async () => {
    await withTenant(A, (tx) => recordAudit(tx, { actor: "system", aktion: "test", details: { x: 1 } }));
    const rows = await withTenant(A, (tx) => tx.select().from(auditEvents));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tenantId: A, actor: "system", aktion: "test", details: { x: 1 } });
    expect(await withTenant(B, (tx) => tx.select().from(auditEvents))).toHaveLength(0);
  });

  it("Prüfpfad ist unveränderlich", async () => {
    await withTenant(A, (tx) => recordAudit(tx, { actor: "system", aktion: "test" }));
    expect(await fehlermeldung(withTenant(A, (tx) => tx.update(auditEvents).set({ aktion: "x" })))).toMatch(/unveränderlich/);
    expect(await fehlermeldung(withTenant(A, (tx) => tx.delete(auditEvents)))).toMatch(/unveränderlich/);
  });

  it("Beweis-Snapshots sind unveränderlich", async () => {
    await withTenant(A, (tx) =>
      tx.insert(evidenceSnapshots).values({ tenantId: A, source: "m365", key: "k", status: "ok", payload: {}, sha256: "00" }),
    );
    expect(await fehlermeldung(withTenant(A, (tx) => tx.update(evidenceSnapshots).set({ status: "x" })))).toMatch(/unveränderlich/);
    expect(await fehlermeldung(withTenant(A, (tx) => tx.delete(evidenceSnapshots)))).toMatch(/unveränderlich/);
  });
});
