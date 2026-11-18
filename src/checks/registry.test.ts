import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadCatalog } from "../catalog/load";
import { registry } from "./registry";

describe("registry", () => {
  it("enthält genau die zehn M365-Prüfungen", () => {
    expect([...registry.keys()].sort()).toEqual([
      "M365-ADMIN-MFA", "M365-GAESTE", "M365-GERAETE-COMPLIANCE", "M365-GERAETE-VERSCHL", "M365-GLOBAL-ADMINS",
      "M365-INAKTIVE-KONTEN", "M365-LEGACY-AUTH", "M365-MFA-ERZWUNGEN", "M365-SECURE-SCORE", "M365-USER-MFA",
    ]);
  });
  it("echter Katalog lädt und jede automatische Anforderung hat eine Prüfung", () => {
    const katalog = loadCatalog(join(process.cwd(), "catalog"), new Set(registry.keys()));
    const auto = katalog.anforderungen.filter((a) => a.nachweisart === "automatisch");
    expect(auto.length).toBeGreaterThanOrEqual(10);
    for (const a of auto) expect(registry.has(a.pruefung!)).toBe(true);
  });
});
