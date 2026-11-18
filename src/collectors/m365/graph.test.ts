import { describe, expect, it, vi } from "vitest";
import { getAllPages, getEinzeln, TokenError, type GraphFetcher } from "./graph";

type Res = { status: number; headers?: Record<string, string>; body?: unknown };
const res = (r: Res) => ({ status: r.status, headers: new Headers(r.headers ?? {}), body: r.body ?? {} });

/** Fake: Pfad → Antwort(en); mehrere Antworten werden der Reihe nach geliefert (letzte wiederholt). */
function fake(map: Record<string, Res | Res[]>): GraphFetcher & { calls: string[] } {
  const calls: string[] = [];
  const idx: Record<string, number> = {};
  return {
    calls,
    async get(path) {
      calls.push(path);
      const e = map[path];
      if (!e) return res({ status: 404, body: { error: { code: "NotFound", message: "x" } } });
      const arr = Array.isArray(e) ? e : [e];
      const i = Math.min(idx[path] ?? 0, arr.length - 1);
      idx[path] = (idx[path] ?? 0) + 1;
      return res(arr[i]);
    },
  };
}
const page = (value: unknown[], next?: string): Res => ({
  status: 200,
  body: { "@odata.context": "ctx", value, ...(next ? { "@odata.nextLink": next } : {}) },
});
const err = (status: number, code: string, message: string, headers?: Record<string, string>): Res => ({
  status,
  headers,
  body: { error: { code, message } },
});

describe("getAllPages", () => {
  it("folgt @odata.nextLink über alle Seiten", async () => {
    const f = fake({ "/users": page([1], "/users?skip=1"), "/users?skip=1": page([2]) });
    expect(await getAllPages(f, "/users")).toEqual({ status: "ok", data: { value: [1, 2] } });
  });
  it("akzeptiert absolute nextLinks", async () => {
    const abs = "https://graph.microsoft.com/v1.0/users?skip=1";
    const f = fake({ "/users": page([1], abs), [abs]: page([2]) });
    expect((await getAllPages(f, "/users")).data).toEqual({ value: [1, 2] });
  });
  it("429 → wartet Retry-After und wiederholt, maximal 3-mal", async () => {
    const sleep = vi.fn(async () => {});
    const r = err(429, "TooManyRequests", "slow", { "Retry-After": "2" });
    const f = fake({ "/x": [r, r, r, r] });
    expect((await getAllPages(f, "/x", sleep)).status).toBe("error");
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(f.calls).toHaveLength(4);
  });
  it("503 wird wiederholt, danach Erfolg; fehlender Retry-After → 5 s", async () => {
    const sleep = vi.fn(async () => {});
    const f = fake({ "/x": [err(503, "Unavailable", "u"), page([1])] });
    expect((await getAllPages(f, "/x", sleep)).status).toBe("ok");
    expect(sleep).toHaveBeenCalledWith(5000);
  });
  it("403 → permission_denied mit Fehler-Payload", async () => {
    const r = await getAllPages(fake({ "/x": err(403, "Authorization_RequestDenied", "no") }), "/x");
    expect(r.status).toBe("permission_denied");
    expect(r.data).toEqual({ fehler: { http: 403, code: "Authorization_RequestDenied", message: "no" } });
  });
  it.each([
    [403, "Authentication_RequestFromNonPremiumTenantOrB2CTenant", "x"],
    [403, "Forbidden", "Tenant needs an AAD Premium P1 license"],
    [400, "BadRequest", "Your tenant is not licensed for this feature"],
    [401, "Forbidden", "AadPremiumLicenseRequired"],
  ])("Lizenzfehler (%i %s) → not_licensed", async (s, c, m) =>
    expect((await getAllPages(fake({ "/x": err(s, c, m) }), "/x")).status).toBe("not_licensed"));
  it("400 ohne Lizenzmarker → error; 500 → error", async () => {
    expect((await getAllPages(fake({ "/x": err(400, "BadRequest", "bad") }), "/x")).status).toBe("error");
    expect((await getAllPages(fake({ "/x": err(500, "Boom", "b") }), "/x")).status).toBe("error");
  });
  it("Netzwerkfehler → error", async () => {
    const f: GraphFetcher = { get: async () => { throw new Error("ECONNRESET"); } };
    expect((await getAllPages(f, "/x")).status).toBe("error");
  });
  it("TokenError wird durchgereicht", async () => {
    const f: GraphFetcher = { get: async () => { throw new TokenError("AADSTS65001"); } };
    await expect(getAllPages(f, "/x")).rejects.toBeInstanceOf(TokenError);
  });
});

describe("getEinzeln", () => {
  it("liefert das Objekt unverändert", async () => {
    const f = fake({ "/p": { status: 200, body: { isEnabled: true } } });
    expect(await getEinzeln(f, "/p")).toEqual({ status: "ok", data: { isEnabled: true } });
  });
});
