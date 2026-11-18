import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./load";

const fx = (name: string) =>
  fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
const alle = new Set(["M365-ADMIN-MFA"]);

const ECHTE_PRUEFUNGEN = [
  "M365-ADMIN-MFA",
  "M365-USER-MFA",
  "M365-MFA-ERZWUNGEN",
  "M365-LEGACY-AUTH",
  "M365-GLOBAL-ADMINS",
  "M365-GAESTE",
  "M365-INAKTIVE-KONTEN",
  "M365-GERAETE-VERSCHL",
  "M365-GERAETE-COMPLIANCE",
  "M365-SECURE-SCORE",
];

describe("loadCatalog", () => {
  it("lädt gültigen Katalog", () => {
    const k = loadCatalog(fx("gueltig"), alle);
    expect(k.bereiche).toHaveLength(10);
    expect(k.anforderungen[0].id).toBe("M365-ADMIN-MFA");
  });
  it("lehnt doppelte IDs ab", () =>
    expect(() => loadCatalog(fx("doppelt"), alle)).toThrow(
      /doppelte ID: M365-ADMIN-MFA/,
    ));
  it("lehnt automatische Anforderung ohne Prüfung ab", () =>
    expect(() => loadCatalog(fx("ohne-pruefung"), alle)).toThrow(
      /pruefung fehlt/,
    ));
  it("lehnt unbekannte Prüfung ab", () =>
    expect(() => loadCatalog(fx("gueltig"), new Set())).toThrow(
      /unbekannte Prüfung: M365-ADMIN-MFA/,
    ));
  it("verlangt genau die Bereiche 1 bis 10", () =>
    expect(() => loadCatalog(fx("neun-bereiche"), alle)).toThrow(
      /Bereich 10 fehlt/,
    ));
  it("lädt den echten Katalog mit den 10 automatischen Prüfungen", () => {
    const k = loadCatalog(
      fileURLToPath(new URL("../../catalog", import.meta.url)),
      new Set(ECHTE_PRUEFUNGEN),
    );
    expect(k.version).toBe("2026-11-18-entwurf");
    expect(k.bereiche).toHaveLength(10);
    expect(k.anforderungen.map((a) => a.id)).toEqual(ECHTE_PRUEFUNGEN);
  });
});
