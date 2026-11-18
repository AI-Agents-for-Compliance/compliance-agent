import { describe, expect, it } from "vitest";
import { pruefeBasicAuth } from "./basic-auth";

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
  it("lehnt alles ab, wenn nichts konfiguriert ist (fail closed)", () => {
    expect(pruefeBasicAuth(hdr(":"), "")).toBe(false);
    expect(pruefeBasicAuth(hdr(""), undefined)).toBe(false);
    expect(pruefeBasicAuth(hdr("demo:geheim"), "nodoppelpunkt")).toBe(false);
  });
});
