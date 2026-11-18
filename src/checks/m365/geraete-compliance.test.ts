import { describe, expect, it } from "vitest";
import { geraeteCompliance } from "./geraete-compliance";
import { anteil, liste, ok } from "../test-util";

const dev = (os: string, complianceState: string) => ({ operatingSystem: os, isEncrypted: true, complianceState });
const q = (n: number, g: number) =>
  geraeteCompliance.run({ "m365.managedDevices": ok(liste(anteil(n, g, () => dev("Windows", "compliant"), () => dev("iOS", "noncompliant"))), "s1") });

describe("M365-GERAETE-COMPLIANCE", () => {
  it("genau 90 % → erfuellt", () => expect(q(90, 100).status).toBe("erfuellt"));
  it("89 % → teilweise", () => expect(q(89, 100).status).toBe("teilweise"));
  it("genau 60 % → teilweise", () => expect(q(60, 100).status).toBe("teilweise"));
  it("59 % → nicht_erfuellt", () => expect(q(59, 100).status).toBe("nicht_erfuellt"));
  it("alle Betriebssysteme zählen", () => expect(q(1, 2).begruendung).toContain("1 von 2"));
  it("0 Geräte → nicht_pruefbar", () => {
    const r = geraeteCompliance.run({ "m365.managedDevices": ok(liste([])) });
    expect(r).toMatchObject({ status: "nicht_pruefbar", begruendung: "keine verwalteten Geräte" });
  });
});
