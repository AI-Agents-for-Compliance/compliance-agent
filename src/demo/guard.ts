import { DEFAULT_DATABASE_URL } from "../db/client";

const LOKAL = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Host der Datenbank-URL; wirft bei ungültiger URL. */
export function datenbankHost(url: string): string {
  return new URL(url).hostname;
}

/** Wirft mit deutscher Meldung, wenn die Datenbank nicht lokal ist (außer ALLOW_DEMO=1). */
export function pruefeLokaleDatenbank(
  url: string = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  env: Record<string, string | undefined> = process.env,
): void {
  let host: string;
  try {
    host = datenbankHost(url);
  } catch {
    throw new Error("DATABASE_URL ist keine gültige URL; Demo-Daten werden nicht angelegt.");
  }
  if (LOKAL.has(host.toLowerCase()) || env.ALLOW_DEMO === "1") return;
  throw new Error(
    `Demo-Daten nur in lokalen Datenbanken: Host "${host}" ist nicht lokal. ` +
      `Zum bewussten Überschreiben ALLOW_DEMO=1 setzen.`,
  );
}
