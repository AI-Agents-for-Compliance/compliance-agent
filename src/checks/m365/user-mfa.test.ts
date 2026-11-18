import { describe, expect, it } from "vitest";
import { userMfa } from "./user-mfa";
import { liste, ok, reg, regMitQuote } from "../test-util";

const q = (n: number, g: number) => userMfa.run({ "m365.userRegistrationDetails": ok(regMitQuote(n, g)) });

describe("M365-USER-MFA", () => {
  it("genau 95 % → erfuellt", () => expect(q(95, 100).status).toBe("erfuellt"));
  it("94 % → teilweise", () => expect(q(94, 100).status).toBe("teilweise"));
  it("genau 50 % → teilweise", () => expect(q(50, 100).status).toBe("teilweise"));
  it("49 % → nicht_erfuellt", () => expect(q(49, 100).status).toBe("nicht_erfuellt"));
  it("Begründung nennt Zahlen und Prozent", () => {
    const r = q(94, 100);
    expect(r.begruendung).toContain("94 von 100");
    expect(r.begruendung).toContain("94 %");
  });
  it("zählt nur Mitglieder, Gäste (case-insensitiv) ignoriert", () => {
    const r = userMfa.run({ "m365.userRegistrationDetails": ok(liste([
      reg("m1"), reg("g1", { userType: "guest", isMfaRegistered: false }), reg("g2", { userType: "Guest", isMfaRegistered: false }),
    ])) });
    expect(r.status).toBe("erfuellt");
    expect(r.begruendung).toContain("1 von 1");
  });
  it("keine Mitglieder → nicht_pruefbar", () => {
    const r = userMfa.run({ "m365.userRegistrationDetails": ok(liste([reg("g", { userType: "guest" })])) });
    expect(r).toMatchObject({ status: "nicht_pruefbar", begruendung: "keine Benutzer gefunden" });
  });
});
