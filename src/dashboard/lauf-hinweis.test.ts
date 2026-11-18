import { describe, expect, it } from "vitest";
import { laufHinweis } from "./lauf-hinweis";

describe("laufHinweis", () => {
  it("kein Lauf und ok: kein Hinweis", () => {
    expect(laufHinweis(null)).toBeNull();
    expect(laufHinweis({ ergebnis: "ok" })).toBeNull();
  });
  it("laufender Lauf (ergebnis null): neutral, kein Fehler", () => {
    expect(laufHinweis({ ergebnis: null })).toEqual({ art: "laeuft", text: "Datenerhebung läuft …" });
  });
  it("fehlgeschlagen: Warnung", () => {
    expect(laufHinweis({ ergebnis: "fehlgeschlagen" })).toEqual({ art: "warnung", text: "Der letzte Lauf ist fehlgeschlagen." });
  });
  it("getrennt: Warnung mit Verbindungstext", () => {
    expect(laufHinweis({ ergebnis: "getrennt" })?.text).toBe("Der letzte Lauf wurde abgebrochen: Die Verbindung ist getrennt.");
  });
});
