import { createHash, timingSafeEqual } from "node:crypto";

/** "user:pass" mit nicht leerem Benutzer und nicht leerem Passwort. */
export function istKonfiguriert(erwartet: string | undefined): erwartet is string {
  if (!erwartet) return false;
  const i = erwartet.indexOf(":");
  return i > 0 && i < erwartet.length - 1;
}

function digest(s: string): Buffer {
  return createHash("sha256").update(s).digest();
}

/**
 * Prueft einen Authorization-Header gegen "user:pass". Fail closed: ohne gueltige
 * Konfiguration (leer, ohne Doppelpunkt, leerer Benutzer oder leeres Passwort) wird immer abgelehnt.
 * Vergleich ueber SHA-256-Digests in konstanter Zeit (gleich lange Puffer).
 */
export function pruefeBasicAuth(header: string | null | undefined, erwartet: string | undefined): boolean {
  if (!istKonfiguriert(erwartet)) return false;
  if (!header) return false;
  const m = /^basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header.trim());
  if (!m) return false;
  const gegeben = Buffer.from(m[1]!, "base64").toString("utf8");
  return timingSafeEqual(digest(gegeben), digest(erwartet));
}
