import { createHash, timingSafeEqual } from "node:crypto";

function digest(s: string): Buffer {
  return createHash("sha256").update(s).digest();
}

/**
 * Prueft einen Authorization-Header gegen "user:pass". Fail closed: ohne gueltige
 * Konfiguration (leer oder ohne Doppelpunkt) wird immer abgelehnt.
 * Vergleich ueber SHA-256-Digests in konstanter Zeit (gleich lange Puffer).
 */
export function pruefeBasicAuth(header: string | null | undefined, erwartet: string | undefined): boolean {
  if (!erwartet || !erwartet.includes(":") || erwartet === ":") return false;
  if (!header) return false;
  const m = /^Basic ([A-Za-z0-9+/]+={0,2})$/.exec(header.trim());
  if (!m) return false;
  const gegeben = Buffer.from(m[1]!, "base64").toString("utf8");
  return timingSafeEqual(digest(gegeben), digest(erwartet));
}
