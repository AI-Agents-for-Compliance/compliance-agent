import { beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { TEST_DATABASE_URL } from "../db/test-setup";
import { resetTenants } from "../db/helpers.test-util";
import { ladeDashboard } from "./daten";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

async function owner<T>(fn: (s: postgres.Sql) => Promise<T>): Promise<T> {
  const s = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try { return await fn(s); } finally { await s.end(); }
}

describe("ladeDashboard", () => {
  beforeEach(() => resetTenants(A, B));

  it("unbekannter/leerer Mandant: nicht verbunden, 10 Bereiche ohne Prozent", async () => {
    const d = await ladeDashboard(A);
    expect(d.verbindung).toBe("nicht_verbunden");
    expect(d.letzterLauf).toBeNull();
    expect(d.befunde).toEqual([]);
    expect(d.reifegrad).toHaveLength(10);
    expect(d.reifegrad.every((r) => r.prozent === null)).toBe(true);
  });

  it("nutzt den letzten erfolgreichen Lauf, meldet fehlgeschlagenen neueren Lauf, trennt Mandanten", async () => {
    await owner(async (s) => {
      await s`INSERT INTO m365_connections (tenant_id, ms_tenant_id, status) VALUES (${A}, 'ms-a', 'aktiv')`;
      const [snap] = await s`INSERT INTO evidence_snapshots (tenant_id, source, key, status, payload, sha256, collected_at)
        VALUES (${A}, 'm365', 'k', 'ok', '{}', 'h', '2026-01-01T08:00:00Z') RETURNING id`;
      const [alt] = await s`INSERT INTO collection_runs (tenant_id, started_at, finished_at, ergebnis)
        VALUES (${A}, '2026-01-01T00:00:00Z', '2026-01-01T00:01:00Z', 'ok') RETURNING id`;
      const [neu] = await s`INSERT INTO collection_runs (tenant_id, started_at, finished_at, ergebnis)
        VALUES (${A}, '2026-01-02T00:00:00Z', '2026-01-02T00:01:00Z', 'ok') RETURNING id`;
      await s`INSERT INTO collection_runs (tenant_id, started_at, finished_at, ergebnis)
        VALUES (${A}, '2026-01-03T00:00:00Z', '2026-01-03T00:01:00Z', 'fehler')`;
      await s`INSERT INTO findings (tenant_id, anforderung_id, status, begruendung, snapshot_ids, run_id)
        VALUES (${A}, 'M365-ADMIN-MFA', 'nicht_erfuellt', 'alt', '{}', ${alt!.id})`;
      await s`INSERT INTO findings (tenant_id, anforderung_id, status, begruendung, snapshot_ids, run_id)
        VALUES (${A}, 'M365-ADMIN-MFA', 'erfuellt', 'neu', ARRAY[${snap!.id}]::uuid[], ${neu!.id})`;
      await s`INSERT INTO findings (tenant_id, anforderung_id, status, begruendung, run_id)
        VALUES (${A}, 'M365-LEGACY-AUTH', 'teilweise', 'ohne snapshot', ${neu!.id})`;
    });
    const d = await ladeDashboard(A);
    expect(d.verbindung).toBe("verbunden");
    expect(d.letzterLauf?.ergebnis).toBe("fehler");
    expect(d.befunde).toHaveLength(2);
    const mfa = d.befunde.find((b) => b.anforderungId === "M365-ADMIN-MFA")!;
    expect(mfa.begruendung).toBe("neu");
    expect(mfa.snapshotAm?.toISOString()).toBe("2026-01-01T08:00:00.000Z");
    expect(mfa.titel).toBe("Administratoren nutzen MFA");
    expect(d.befunde.find((b) => b.anforderungId === "M365-LEGACY-AUTH")!.snapshotAm).toBeNull();
    expect(d.reifegrad.find((r) => r.bereich === 10)!.prozent).toBe(100);
    expect(d.reifegrad.find((r) => r.bereich === 9)!.prozent).toBe(50);

    const andere = await ladeDashboard(B);
    expect(andere.verbindung).toBe("nicht_verbunden");
    expect(andere.befunde).toEqual([]);
  });

  it("getrennte Verbindung", async () => {
    await owner((s) => s`INSERT INTO m365_connections (tenant_id, ms_tenant_id, status) VALUES (${A}, 'ms-a', 'getrennt')`);
    expect((await ladeDashboard(A)).verbindung).toBe("getrennt");
  });
});
