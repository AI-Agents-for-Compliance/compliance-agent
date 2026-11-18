import type { EvidenceStatus } from "../../evidence/types";

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** Nur lesend: es gibt bewusst keine andere Methode als GET. */
export interface GraphFetcher {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(path: string): Promise<{ status: number; headers: Headers; body: any }>;
}

export type EndpointResult = { status: EvidenceStatus; data: unknown };

/** Token konnte nicht beschafft werden (z. B. AADSTS65001/7000229: Zustimmung entzogen). */
export class TokenError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TokenError";
  }
}

const MAX_RETRIES = 3;
const DEFAULT_RETRY_MS = 5000;
const RETRY_STATUS = new Set([429, 503, 504]);
const LIZENZ = /licen[sc]e|premium|AadPremiumLicenseRequired/i;
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Sleep = (ms: number) => Promise<void>;
type Raw = { status: number; headers: Headers; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

function retryMs(h: Headers): number {
  const s = Number(h.get("Retry-After"));
  return Number.isFinite(s) && s >= 0 && h.get("Retry-After")?.trim() ? s * 1000 : DEFAULT_RETRY_MS;
}

function fehler(r: Raw): EndpointResult {
  const e = r.body?.error;
  const code = typeof e?.code === "string" ? e.code : null;
  const message = typeof e?.message === "string" ? e.message : null;
  const lizenz = LIZENZ.test(code ?? "") || LIZENZ.test(message ?? "");
  let status: EvidenceStatus = "error";
  if (r.status === 401 || r.status === 403) status = lizenz ? "not_licensed" : r.status === 403 ? "permission_denied" : "error";
  else if (r.status === 400 && lizenz) status = "not_licensed";
  return { status, data: { fehler: { http: r.status, code, message } } };
}

/** Ein GET mit Retry (429/503/504); TokenError wird durchgereicht, andere Ausnahmen werden zum Fehlerergebnis. */
async function getMitRetry(f: GraphFetcher, path: string, sleep: Sleep): Promise<{ raw: Raw } | { fail: EndpointResult }> {
  for (let versuch = 0; ; versuch++) {
    let raw: Raw;
    try {
      raw = await f.get(path);
    } catch (e) {
      if (e instanceof TokenError) throw e;
      return { fail: { status: "error", data: { fehler: { http: null, code: "NetworkError", message: e instanceof Error ? e.message : String(e) } } } };
    }
    if (raw.status >= 200 && raw.status < 300) return { raw };
    if (RETRY_STATUS.has(raw.status) && versuch < MAX_RETRIES) {
      await sleep(retryMs(raw.headers));
      continue;
    }
    return { fail: fehler(raw) };
  }
}

/** Listen-Endpunkt: folgt @odata.nextLink und liefert { value: [...] }. */
export async function getAllPages(f: GraphFetcher, path: string, sleep: Sleep = realSleep): Promise<EndpointResult> {
  const value: unknown[] = [];
  let next: string | undefined = path;
  const gesehen = new Set<string>();
  while (next) {
    if (gesehen.has(next)) return { status: "error", data: { fehler: { http: null, code: "PagingLoop", message: next } } };
    gesehen.add(next);
    const r = await getMitRetry(f, next, sleep);
    if ("fail" in r) return r.fail;
    const body = r.raw.body;
    if (Array.isArray(body?.value)) value.push(...body.value);
    next = typeof body?.["@odata.nextLink"] === "string" ? body["@odata.nextLink"] : undefined;
  }
  return { status: "ok", data: { value } };
}

/** Einzelobjekt-Endpunkt: ein GET, Body unverändert. */
export async function getEinzeln(f: GraphFetcher, path: string, sleep: Sleep = realSleep): Promise<EndpointResult> {
  const r = await getMitRetry(f, path, sleep);
  if ("fail" in r) return r.fail;
  return { status: "ok", data: r.raw.body ?? {} };
}

/** Dünner Adapter auf @azure/identity + fetch; Zugangsdaten werden erst hier gelesen. */
export function createGraphFetcher(msTenantId: string): GraphFetcher {
  const clientId = process.env.M365_CLIENT_ID;
  const certificatePath = process.env.M365_CERT_PATH;
  if (!clientId || !certificatePath) throw new Error("M365_CLIENT_ID und M365_CERT_PATH müssen gesetzt sein");
  let credential: import("@azure/identity").ClientCertificateCredential | undefined;
  return {
    async get(path) {
      let token: string;
      try {
        const { ClientCertificateCredential } = await import("@azure/identity");
        credential ??= new ClientCertificateCredential(msTenantId, clientId, { certificatePath });
        const t = await credential.getToken("https://graph.microsoft.com/.default");
        token = t.token;
      } catch (e) {
        throw new TokenError(e instanceof Error ? e.message : String(e), { cause: e });
      }
      const url = path.startsWith("http") ? path : GRAPH_BASE + path;
      const resp = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      const text = await resp.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }
      return { status: resp.status, headers: resp.headers, body };
    },
  };
}
