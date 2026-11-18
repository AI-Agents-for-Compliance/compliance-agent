import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/jobs/boss", () => ({ enqueueCollection: vi.fn(async () => "job-1") }));

import { closeDb } from "@/db/client";
import { resetTenants, sql } from "@/db/helpers.test-util";
import { withTenant } from "@/db/tenant";
import { enqueueCollection } from "@/jobs/boss";
import { signState } from "@/connect/state";
import { GET } from "./route";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const MS = "33333333-3333-4333-8333-333333333333";
const MS2 = "44444444-4444-4444-8444-444444444444";

beforeEach(async () => {
  vi.stubEnv("CONNECT_STATE_SECRET", "s".repeat(40));
  vi.stubEnv("APP_URL", "https://app.example.test");
  vi.mocked(enqueueCollection).mockReset();
  vi.mocked(enqueueCollection).mockResolvedValue("job-1");
  await resetTenants(A, B);
});
afterAll(closeDb);
afterEach(() => vi.unstubAllEnvs());

const req = (q: string) => new Request(`http://localhost/api/connect/m365/callback${q}`);
const rows = <T>(q: ReturnType<typeof sql>) =>
  withTenant(A, async (tx) => (await tx.execute(q)) as unknown as T[]);
const verbindungen = () => rows<{ ms_tenant_id: string; status: string }>(sql`SELECT ms_tenant_id, status FROM m365_connections`);
const audits = () => rows<{ aktion: string; details: Record<string, unknown> }>(sql`SELECT aktion, details FROM audit_events ORDER BY created_at`);

describe("GET /api/connect/m365/callback", () => {
  it("manipulierter state → 400, nichts gespeichert", async () => {
    const res = await GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}x`));
    expect(res.status).toBe(400);
    expect(await verbindungen()).toHaveLength(0);
    expect(enqueueCollection).not.toHaveBeenCalled();
  });
  it("abgelaufener state → 400", async () => {
    const s = signState(A, new Date(Date.now() - 11 * 60_000));
    expect((await GET(req(`?admin_consent=True&tenant=${MS}&state=${s}`))).status).toBe(400);
  });
  it("fehlender state → 400", async () => {
    expect((await GET(req(`?admin_consent=True&tenant=${MS}`))).status).toBe(400);
  });
  it("gültiger Callback speichert Verbindung, auditiert und reiht Job ein", async () => {
    const res = await GET(req(`?admin_consent=true&tenant=${MS}&state=${signState(A)}`));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`https://app.example.test/dashboard?tenant=${A}`);
    expect(await verbindungen()).toEqual([{ ms_tenant_id: MS, status: "aktiv" }]);
    expect((await audits()).map((a) => a.aktion)).toEqual(["verbindung_hergestellt"]);
    expect((await audits())[0].details).toEqual({ msTenantId: MS });
    expect(enqueueCollection).toHaveBeenCalledWith(A);
  });
  it("admin_consent case-insensitiv; andere Werte → 400", async () => {
    expect((await GET(req(`?admin_consent=TRUE&tenant=${MS}&state=${signState(A)}`))).status).toBe(302);
    await resetTenants(A, B);
    expect((await GET(req(`?admin_consent=false&tenant=${MS}&state=${signState(A)}`))).status).toBe(400);
    expect(await verbindungen()).toHaveLength(0);
  });
  it("ungültige MS-Tenant-ID → 400", async () => {
    expect((await GET(req(`?admin_consent=True&tenant=nope&state=${signState(A)}`))).status).toBe(400);
    expect(await verbindungen()).toHaveLength(0);
  });
  it("erneute Verbindung ersetzt die Zeile (eine je Mandant) und auditiert den Vorgänger", async () => {
    await GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}`));
    await GET(req(`?admin_consent=True&tenant=${MS2}&state=${signState(A)}`));
    expect(await verbindungen()).toEqual([{ ms_tenant_id: MS2, status: "aktiv" }]);
    const a = await audits();
    expect(a[1].details).toEqual({ msTenantId: MS2, vorherigerMsTenantId: MS });
  });
  it("admin_consent fehlt ganz → 400", async () => {
    expect((await GET(req(`?tenant=${MS}&state=${signState(A)}`))).status).toBe(400);
    expect(await verbindungen()).toHaveLength(0);
  });
  it("APP_URL fehlt → 500, nichts gespeichert", async () => {
    vi.stubEnv("APP_URL", "");
    expect((await GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}`))).status).toBe(500);
    expect(await verbindungen()).toHaveLength(0);
  });
  it("parallele Callbacks → genau eine Verbindungszeile", async () => {
    // Hinweis: DB_POOL_MAX=1 serialisiert die Verbindungen; geprüft wird der Upsert-/Unique-Pfad.
    const rs = await Promise.all([
      GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}`)),
      GET(req(`?admin_consent=True&tenant=${MS2}&state=${signState(A)}`)),
    ]);
    expect(rs.map((r) => r.status)).toEqual([302, 302]);
    expect(await verbindungen()).toHaveLength(1);
  });
  it("Rebind setzt last_collected_at zurück", async () => {
    await GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}`));
    await withTenant(A, (tx) => tx.execute(sql`UPDATE m365_connections SET last_collected_at = now()`));
    await GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}`));
    expect((await rows<{ l: unknown }>(sql`SELECT last_collected_at AS l FROM m365_connections`))[0].l).not.toBeNull();
    await GET(req(`?admin_consent=True&tenant=${MS2}&state=${signState(A)}`));
    expect((await rows<{ l: unknown }>(sql`SELECT last_collected_at AS l FROM m365_connections`))[0].l).toBeNull();
  });
  it("error-Wert wird gefiltert", async () => {
    await GET(req(`?error=${encodeURIComponent("<script>x")}&state=${signState(A)}`));
    expect((await audits())[0].details).toEqual({ fehler: "unbekannt" });
  });
  it("Enqueue-Fehler: Verbindung bleibt, Redirect trotzdem", async () => {
    vi.mocked(enqueueCollection).mockRejectedValue(new Error("boss down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}`));
    expect(res.status).toBe(302);
    expect(await verbindungen()).toHaveLength(1);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
  it("Zustimmung abgelehnt → Hinweis, nichts gespeichert, Audit", async () => {
    const res = await GET(req(`?error=access_denied&state=${signState(A)}`));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      `https://app.example.test/dashboard?tenant=${A}&hinweis=zustimmung_abgelehnt`,
    );
    expect(await verbindungen()).toHaveLength(0);
    expect((await audits()).map((a) => a.aktion)).toEqual(["zustimmung_abgelehnt"]);
    expect(enqueueCollection).not.toHaveBeenCalled();
  });
  it("error mit ungültigem state → 400", async () => {
    expect((await GET(req(`?error=access_denied&state=bad`))).status).toBe(400);
  });
});
