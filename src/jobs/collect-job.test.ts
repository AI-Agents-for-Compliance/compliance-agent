import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb } from "../db/client";
import { resetTenants, sql } from "../db/helpers.test-util";
import { withTenant } from "../db/tenant";
import { registry } from "../checks/registry";
import { loadCatalog } from "../catalog/load";
import type { Katalog } from "../catalog/schema";
import { ENDPOINTS } from "../collectors/m365/endpoints";
import { TokenError, TokenTransientError, type GraphFetcher } from "../collectors/m365/graph";
import { COLLECT_JOB, collectJobHandler, runCollection } from "./collect-job";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const MS = "ms-tenant-a";

let katalog: Katalog;
beforeAll(() => {
  katalog = loadCatalog("catalog", new Set(registry.keys()));
});
beforeEach(async () => {
  await resetTenants(A, B);
  await withTenant(A, (tx) =>
    tx.execute(sql`INSERT INTO m365_connections (tenant_id, ms_tenant_id, status) VALUES (${A}, ${MS}, 'aktiv')`),
  );
});
afterAll(closeDb);

const ok = (body: unknown) => ({ status: 200, headers: new Headers(), body });
const fetcherOk: GraphFetcher = {
  async get(path) {
    return ok(ENDPOINTS.find((e) => e.path === path)?.liste ? { value: [] } : { id: "obj" });
  },
};
const fetcherCrash = (err: Error): GraphFetcher => ({
  async get() {
    throw err;
  },
});
const deps = (f: GraphFetcher) => ({ fetcherFor: () => f, katalog, sleep: async () => {} });

async function rows<T>(tenant: string, q: ReturnType<typeof sql>): Promise<T[]> {
  return withTenant(tenant, async (tx) => (await tx.execute(q)) as unknown as T[]);
}
const befundeVon = (runId: string) =>
  rows<{ id: string }>(A, sql`SELECT id FROM findings WHERE run_id = ${runId}`);
const auditAktionen = async () =>
  (await rows<{ aktion: string }>(A, sql`SELECT aktion FROM audit_events`)).map((r) => r.aktion);
const status = async () =>
  (await rows<{ status: string }>(A, sql`SELECT status FROM m365_connections`))[0].status;

describe("runCollection", () => {
  it("Job-Name", () => expect(COLLECT_JOB).toBe("m365.collect"));

  it("schreibt Befunde und Prüfpfad", async () => {
    const { runId, ergebnis } = await runCollection(A, deps(fetcherOk));
    expect(ergebnis).toBe("ok");
    expect(await befundeVon(runId)).toHaveLength(10);
    expect(await auditAktionen()).toContain("sammlung_abgeschlossen");
    const [audit] = await rows<{ details: { runId: string; anzahl: Record<string, number> } }>(
      A,
      sql`SELECT details FROM audit_events WHERE aktion = 'sammlung_abgeschlossen'`,
    );
    expect(audit.details.runId).toBe(runId);
    const summe = Object.values(audit.details.anzahl).reduce((a, b) => a + b, 0);
    expect(summe).toBe(10);
    expect(Object.keys(audit.details.anzahl).sort()).toEqual(["erfuellt", "nicht_erfuellt", "nicht_pruefbar", "teilweise"]);
    const [run] = await rows<{ ergebnis: string; finished_at: Date | null }>(A, sql`SELECT ergebnis, finished_at FROM collection_runs`);
    expect(run).toMatchObject({ ergebnis: "ok" });
    expect(run.finished_at).not.toBeNull();
    const [c] = await rows<{ last_collected_at: Date | null }>(A, sql`SELECT last_collected_at FROM m365_connections`);
    expect(c.last_collected_at).not.toBeNull();
  });

  it("entzogene Zustimmung → getrennt, alte Befunde bleiben, keine neuen Snapshots", async () => {
    const alt = await runCollection(A, deps(fetcherOk));
    const vorher = await rows<{ n: number }>(A, sql`SELECT count(*)::int AS n FROM evidence_snapshots`);
    const neu = await runCollection(A, deps(fetcherCrash(new TokenError("AADSTS65001 weg"))));
    expect(neu.ergebnis).toBe("getrennt");
    expect(await status()).toBe("getrennt");
    expect(await befundeVon(alt.runId)).toHaveLength(10);
    expect(await befundeVon(neu.runId)).toHaveLength(0);
    expect(await auditAktionen()).toContain("verbindung_getrennt");
    const nachher = await rows<{ n: number }>(A, sql`SELECT count(*)::int AS n FROM evidence_snapshots`);
    expect(nachher[0].n).toBe(vorher[0].n);
    const [run] = await rows<{ ergebnis: string; finished_at: Date | null }>(
      A,
      sql`SELECT ergebnis, finished_at FROM collection_runs WHERE id = ${neu.runId}`,
    );
    expect(run.ergebnis).toBe("getrennt");
    expect(run.finished_at).not.toBeNull();
  });

  it("vorübergehender Token-Fehler → fehlgeschlagen, Verbindung bleibt aktiv, keine Befunde", async () => {
    const r = await runCollection(A, deps(fetcherCrash(new TokenTransientError("Ausfall"))));
    expect(r.ergebnis).toBe("fehlgeschlagen");
    expect(await status()).toBe("aktiv");
    expect(await befundeVon(r.runId)).toHaveLength(0);
    const aktionen = await auditAktionen();
    expect(aktionen).toContain("sammlung_fehlgeschlagen");
    expect(aktionen).not.toContain("verbindung_getrennt");
    const [run] = await rows<{ ergebnis: string }>(A, sql`SELECT ergebnis FROM collection_runs WHERE id = ${r.runId}`);
    expect(run.ergebnis).toBe("fehlgeschlagen");
  });

  it("ohne aktive Verbindung → Fehler, kein Lauf", async () => {
    await expect(runCollection(B, deps(fetcherOk))).rejects.toThrow("keine aktive Microsoft-365-Verbindung");
    const n = await rows<{ n: number }>(B, sql`SELECT count(*)::int AS n FROM collection_runs`);
    expect(n[0].n).toBe(0);
  });

  it("Handler wirft bei vorübergehendem Fehler, damit pg-boss wiederholt", async () => {
    await expect(collectJobHandler(A, deps(fetcherCrash(new TokenTransientError("Ausfall"))))).rejects.toThrow(
      "fehlgeschlagen",
    );
  });

  it("Prüfpfad-Code trägt den Fehlernamen", async () => {
    await runCollection(A, deps(fetcherCrash(new TokenTransientError("Ausfall"))));
    const [a] = await rows<{ details: { code: string } }>(A, sql`SELECT details FROM audit_events WHERE aktion = 'sammlung_fehlgeschlagen'`);
    expect(a.details.code).toBe("TokenTransientError");
  });
});
