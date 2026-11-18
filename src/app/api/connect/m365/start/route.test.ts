import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb } from "@/db/client";
import { resetTenants } from "@/db/helpers.test-util";
import { verifyState } from "@/connect/state";
import { GET } from "./route";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const UNKNOWN = "99999999-9999-4999-8999-999999999999";

beforeEach(async () => {
  vi.stubEnv("CONNECT_STATE_SECRET", "s".repeat(40));
  vi.stubEnv("APP_URL", "https://app.example.test");
  vi.stubEnv("M365_CLIENT_ID", "client-123");
  await resetTenants(A, B);
});
afterAll(closeDb);
afterEach(() => vi.unstubAllEnvs());

const req = (q: string) => new Request(`http://evil.example/api/connect/m365/start${q}`);

describe("GET /api/connect/m365/start", () => {
  it("302 auf Admin-Consent-URL mit signiertem state", async () => {
    const res = await GET(req(`?tenant=${A}`));
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin + loc.pathname).toBe("https://login.microsoftonline.com/organizations/v2.0/adminconsent");
    expect(loc.searchParams.get("client_id")).toBe("client-123");
    expect(loc.searchParams.get("scope")).toBe("https://graph.microsoft.com/.default");
    expect(loc.searchParams.get("redirect_uri")).toBe("https://app.example.test/api/connect/m365/callback");
    expect(verifyState(loc.searchParams.get("state")!)).toEqual({ tenantId: A });
  });
  it("ungültige oder unbekannte Mandanten-ID → 400", async () => {
    expect((await GET(req(`?tenant=nope`))).status).toBe(400);
    expect((await GET(req(``))).status).toBe(400);
    expect((await GET(req(`?tenant=${UNKNOWN}`))).status).toBe(400);
  });
});
