export interface LaufHinweis {
  art: "laeuft" | "warnung";
  text: string;
}

/** Entscheidet, welcher Hinweis zum letzten Lauf (beliebigen Ergebnisses) angezeigt wird. */
export function laufHinweis(lauf: { ergebnis: string | null } | null): LaufHinweis | null {
  if (!lauf) return null;
  if (lauf.ergebnis === null) return { art: "laeuft", text: "Datenerhebung läuft …" };
  if (lauf.ergebnis === "ok") return null;
  if (lauf.ergebnis === "getrennt") {
    return { art: "warnung", text: "Der letzte Lauf wurde abgebrochen: Die Verbindung ist getrennt." };
  }
  return { art: "warnung", text: "Der letzte Lauf ist fehlgeschlagen." };
}
