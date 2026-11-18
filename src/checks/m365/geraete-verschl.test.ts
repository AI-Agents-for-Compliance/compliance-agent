import { describe, expect, it } from "vitest";
import { geraeteVerschl } from "./geraete-verschl";
import { anteil, liste, ok } from "../test-util";

const dev = (os: string, isEncrypted: boolean) => ({ operatingSystem: os, isEncrypted, complianceState: "compliant" });
const q = (n: number, g: number) =>
  geraeteVerschl.run({ "m365.managedDevices": ok(liste(anteil(n, g, () => dev("Windows", true), () => dev("macOS", false))), "s1") });

describe("M365-GERAETE-VERSCHL", () => {
  it("genau 95 % → erfuellt", () => expect(q(95, 100).status).toBe("erfuellt"));
  it("94 % → teilweise", () => expect(q(94, 100).status).toBe("teilweise"));
  it("genau 70 % → teilweise", () => expect(q(70, 100).status).toBe("teilweise"));
  it("69 % → nicht_erfuellt", () => expect(q(69, 100).status).toBe("nicht_erfuellt"));
  it("iOS/Android zählen nicht", () => {
    const r = geraeteVerschl.run({ "m365.managedDevices": ok(liste([dev("Windows", true), dev("iOS", false), dev("Android", false)])) });
    expect(r.status).toBe("erfuellt");
    expect(r.begruendung).toContain("1 von 1");
  });
  it("0 Windows/macOS-Geräte → nicht_pruefbar", () => {
    const r = geraeteVerschl.run({ "m365.managedDevices": ok(liste([dev("iOS", false)])) });
    expect(r).toMatchObject({ status: "nicht_pruefbar", begruendung: "keine verwalteten Geräte" });
  });
});
