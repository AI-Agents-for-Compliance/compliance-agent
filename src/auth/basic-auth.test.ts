import { describe, expect, it } from "vitest";
import { istKonfiguriert, pruefeBasicAuth } from "./basic-auth";

const hdr = (s: string) => `Basic ${Buffer.from(s).toString("base64")}`;

describe("pruefeBasicAuth", () => {
  it("akzeptiert korrekte Zugangsdaten (Passwort darf Doppelpunkt enthalten)", () => {
    expect(pruefeBasicAuth(hdr("demo:geheim"), "demo:geheim")).toBe(true);
    expect(pruefeBasicAuth(hdr("demo:ge:heim"), "demo:ge:heim")).toBe(true);
  });
  it("lehnt falsche, fehlende und fehlerhafte Header ab", () => {
    expect(pruefeBasicAuth(hdr("demo:falsch"), "demo:geheim")).toBe(false);
    expect(pruefeBasicAuth(hdr("demo:geheim2"), "demo:geheim")).toBe(false);
    expect(pruefeBasicAuth(null, "demo:geheim")).toBe(false);
    expect(pruefeBasicAuth("Bearer abc", "demo:geheim")).toBe(false);
    expect(pruefeBasicAuth("Basic !!!", "demo:geheim")).toBe(false);
  });
  it("Schema ist unabhängig von der Groß-/Kleinschreibung; Nicht-ASCII-Passwort", () => {
    expect(pruefeBasicAuth(hdr("demo:geheim").replace("Basic", "basic"), "demo:geheim")).toBe(true);
    expect(pruefeBasicAuth(hdr("demo:geheim").replace("Basic", "BASIC"), "demo:geheim")).toBe(true);
    expect(pruefeBasicAuth(hdr("dëmo:pässwörd€"), "dëmo:pässwörd€")).toBe(true);
    expect(pruefeBasicAuth(hdr("dëmo:pässwörd"), "dëmo:pässwörd€")).toBe(false);
  });
  it("leerer Benutzer oder leeres Passwort in der Konfiguration: nicht konfiguriert", () => {
    expect(istKonfiguriert("demo:geheim")).toBe(true);
    for (const c of ["demo:", ":geheim", ":", "", undefined, "x"]) expect(istKonfiguriert(c)).toBe(false);
    expect(pruefeBasicAuth(hdr("demo:"), "demo:")).toBe(false);
    expect(pruefeBasicAuth(hdr(":geheim"), ":geheim")).toBe(false);
  });
  it("lehnt alles ab, wenn nichts konfiguriert ist (fail closed)", () => {
    expect(pruefeBasicAuth(hdr(":"), "")).toBe(false);
    expect(pruefeBasicAuth(hdr(""), undefined)).toBe(false);
    expect(pruefeBasicAuth(hdr("demo:geheim"), "nodoppelpunkt")).toBe(false);
  });
});
