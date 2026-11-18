import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "./client";
import { withTenant } from "./tenant";
import { findings } from "./schema";
import { fehlermeldung, resetTenants } from "./helpers.test-util";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const befund = (tenantId: string) => ({
  tenantId,
  anforderungId: "m365-mfa",
  status: "erfuellt",
  begruendung: "test",
});

beforeEach(() => resetTenants(A, B));
afterAll(closeDb);

describe("Mandantentrennung (RLS)", () => {
  it("Mandant A sieht keine Daten von Mandant B", async () => {
    await withTenant(B, (tx) => tx.insert(findings).values(befund(B)));
    const rows = await withTenant(A, (tx) => tx.select().from(findings));
    expect(rows).toHaveLength(0);
    const rowsB = await withTenant(B, (tx) => tx.select().from(findings));
    expect(rowsB).toHaveLength(1);
  });

  it("Schreiben für fremden Mandanten scheitert", async () => {
    expect(
      await fehlermeldung(withTenant(A, (tx) => tx.insert(findings).values(befund(B)))),
    ).toMatch(/row-level security/);
  });

  it("withTenant läuft als app_user ohne BYPASSRLS", async () => {
    const r = await withTenant(A, (tx) =>
      tx.execute(sql`SELECT current_user AS u, (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user) AS bypass`),
    );
    expect(r[0]).toEqual({ u: "app_user", bypass: false });
  });

  it("ohne Mandantenkontext sind keine Zeilen sichtbar (kein Fehler)", async () => {
    await withTenant(A, (tx) => tx.insert(findings).values(befund(A)));
    // Als app_user, aber ohne app.tenant_id: current_setting(..., true) -> NULL -> keine Zeilen.
    const rows = await getDb().transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE app_user`);
      return tx.select().from(findings);
    });
    expect(rows).toHaveLength(0);
  });

  it("Mandanten-ID wird validiert", async () => {
    expect(
      await fehlermeldung(withTenant("x'; drop table findings;--", async () => 1)),
    ).toMatch(/Mandanten-ID/);
  });

  it("Mandantenkontext leckt nicht zwischen Transaktionen", async () => {
    await withTenant(A, async () => 1);
    const rows = await getDb().transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE app_user`);
      return tx.execute(sql`SELECT current_setting('app.tenant_id', true) AS t`);
    });
    expect(rows[0]!.t === null || rows[0]!.t === "").toBe(true);
  });
});
