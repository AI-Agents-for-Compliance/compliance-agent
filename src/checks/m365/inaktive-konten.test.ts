import { describe, expect, it } from "vitest";
import { createInaktiveKontenCheck } from "./inaktive-konten";
import { anteil, liste, ok } from "../test-util";

const now = new Date("2026-06-01T00:00:00Z");
const check = createInaktiveKontenCheck(() => now);
const tage = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const user = (name: string, o: Record<string, unknown> = {}) => ({
  userPrincipalName: `${name}@x.de`, accountEnabled: true, userType: "Member",
  signInActivity: { lastSignInDateTime: tage(1) }, ...o,
});
const run = (users: unknown[]) => check.run({ "m365.users": ok(liste(users), "s1") });
const mitQuote = (inaktiv: number, gesamt: number) =>
  run(anteil(inaktiv, gesamt, (i) => user(`i${i}`, { signInActivity: { lastSignInDateTime: tage(91) } }), (i) => user(`a${i}`)));

describe("M365-INAKTIVE-KONTEN", () => {
  it("genau 5 % inaktiv → erfuellt", () => expect(mitQuote(5, 100).status).toBe("erfuellt"));
  it("6 % → teilweise", () => expect(mitQuote(6, 100).status).toBe("teilweise"));
  it("genau 15 % → teilweise", () => expect(mitQuote(15, 100).status).toBe("teilweise"));
  it("16 % → nicht_erfuellt", () => expect(mitQuote(16, 100).status).toBe("nicht_erfuellt"));
  it("Begründung mit Zahlen", () => expect(mitQuote(6, 100).begruendung).toContain("6 von 100"));
  it("genau 90 Tage zählt noch als aktiv, 91 als inaktiv", () => {
    expect(run([user("a", { signInActivity: { lastSignInDateTime: tage(90) } })]).status).toBe("erfuellt");
    expect(run([user("a", { signInActivity: { lastSignInDateTime: tage(91) } })]).status).toBe("nicht_erfuellt");
  });
  it("fehlende signInActivity / null-Datum zählt als inaktiv", () => {
    expect(run([user("a", { signInActivity: undefined })]).status).toBe("nicht_erfuellt");
    expect(run([user("a", { signInActivity: { lastSignInDateTime: null } })]).status).toBe("nicht_erfuellt");
  });
  it("deaktivierte Konten und Gäste sind nicht in der Basis", () => {
    const r = run([user("a"), user("d", { accountEnabled: false, signInActivity: undefined }), user("g", { userType: "Guest", signInActivity: undefined })]);
    expect(r.status).toBe("erfuellt");
    expect(r.begruendung).toContain("0 von 1");
  });
  it("keine aktiven Konten → nicht_pruefbar", () => {
    expect(run([user("d", { accountEnabled: false })])).toMatchObject({ status: "nicht_pruefbar", begruendung: "keine aktiven Konten" });
  });
});
