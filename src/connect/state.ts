import { createHmac, timingSafeEqual } from "node:crypto";

export class InvalidStateError extends Error {
  constructor(message = "Ungültiger state") {
    super(message);
    this.name = "InvalidStateError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL_SECONDS = 10 * 60;

function secret(): string {
  const s = process.env.CONNECT_STATE_SECRET ?? "";
  if (s.length < 32) {
    throw new Error("CONNECT_STATE_SECRET fehlt oder ist zu kurz (mindestens 32 Zeichen erforderlich)");
  }
  return s;
}

const mac = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** Signierter, 10 Minuten gültiger state: base64url(JSON {t, exp}) + "." + HMAC. */
export function signState(tenantId: string, now: Date = new Date()): string {
  if (!UUID.test(tenantId)) throw new Error("Ungültige Mandanten-ID");
  const exp = Math.floor(now.getTime() / 1000) + TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ t: tenantId, exp })).toString("base64url");
  return `${payload}.${mac(payload)}`;
}

export function verifyState(state: string, now: Date = new Date()): { tenantId: string } {
  secret(); // wirft bei fehlendem Secret (kein InvalidStateError)
  const parts = state.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new InvalidStateError();
  const [payload, sig] = parts;
  const expected = Buffer.from(mac(payload));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new InvalidStateError();
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new InvalidStateError();
  }
  const { t, exp } = (data ?? {}) as { t?: unknown; exp?: unknown };
  if (typeof t !== "string" || !UUID.test(t) || typeof exp !== "number") throw new InvalidStateError();
  if (Math.floor(now.getTime() / 1000) > exp) throw new InvalidStateError("state abgelaufen");
  return { tenantId: t };
}
