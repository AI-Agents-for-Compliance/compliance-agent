import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb } from "../../db/client";
import { withTenant } from "../../db/tenant";
import { resetTenants, sql } from "../../db/helpers.test-util";
import { ENDPOINTS } from "./endpoints";
import { TokenError, type GraphFetcher } from "./graph";
import { collectM365, ConsentRevokedError } from "./collect";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
beforeEach(() => resetTenants(A, B));
afterAll(closeDb);

const ok = (body: unknown) => ({ status: 200, headers: new Headers(), body });
function fakeAlleOk(): GraphFetcher & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async get(path) {
      calls.push(path);
      return ok(ENDPOINTS.find((e) => e.path === path)?.liste ? { "@odata.context": "c", value: [{ id: 1 }] } : { id: "obj" });
    },
  };
}

describe("collectM365", () => {
  it("speichert je Endpunkt einen Snapshot, nur GET", async () => {
    const f = fakeAlleOk();
    const { bundle, n } = await withTenant(A, async (tx) => {
      const bundle = await collectM365(tx, f);
      const rows = await tx.execute(sql`SELECT count(*)::int AS n FROM evidence_snapshots`);
      return { bundle, n: (rows as unknown as { n: number }[])[0].n };
    });
    expect(Object.keys(bundle)).toHaveLength(8);
    expect(n).toBe(8);
    expect(bundle["m365.users"]).toMatchObject({ status: "ok", data: { value: [{ id: 1 }] } });
    expect(bundle["m365.securityDefaults"]).toMatchObject({ status: "ok", data: { id: "obj" } });
    expect(f.calls).toHaveLength(8);
  });
  it("nicht-ok Endpunkt wird mit Status und Fehler-Payload gespeichert, Rest läuft weiter", async () => {
    const f: GraphFetcher = {
      async get(path) {
        if (path.includes("conditionalAccess"))
          return { status: 403, headers: new Headers(), body: { error: { code: "Forbidden", message: "AAD Premium license required" } } };
        return ok({ value: [] });
      },
    };
    const bundle = await withTenant(A, (tx) => collectM365(tx, f));
    expect(bundle["m365.conditionalAccessPolicies"]?.status).toBe("not_licensed");
    expect(bundle["m365.conditionalAccessPolicies"]?.data).toMatchObject({ fehler: { http: 403 } });
    expect(bundle["m365.users"]?.status).toBe("ok");
  });
  it("Token-Fehler → ConsentRevokedError, nichts gespeichert", async () => {
    let n = 0;
    const f: GraphFetcher = {
      async get() {
        if (++n === 3) throw new TokenError("AADSTS7000229");
        return ok({ value: [] });
      },
    };
    await expect(
      withTenant(A, async (tx) => {
        try {
          await collectM365(tx, f);
        } finally {
          expect(n).toBe(3); // abgebrochen beim ersten Token-Fehler
        }
      }),
    ).rejects.toBeInstanceOf(ConsentRevokedError);
  });
});
