import { describe, expect, it } from "vitest";
import { mfaErzwungen } from "./mfa-erzwungen";
import { caPolicy, item, liste, ok } from "../test-util";

const sd = (isEnabled: boolean) => ok({ isEnabled }, "sd");
const run = (isEnabled: boolean, policies: unknown[]) =>
  mfaErzwungen.run({ "m365.securityDefaults": sd(isEnabled), "m365.conditionalAccessPolicies": ok(liste(policies), "ca") });

describe("M365-MFA-ERZWUNGEN", () => {
  it("Security Defaults aktiv → erfuellt", () => {
    expect(run(true, [])).toMatchObject({ status: "erfuellt", snapshotIds: ["sd", "ca"] });
  });
  it("Security Defaults aktiv, CA nicht lizenziert → erfuellt", () => {
    const r = mfaErzwungen.run({ "m365.securityDefaults": sd(true), "m365.conditionalAccessPolicies": item("not_licensed") });
    expect(r.status).toBe("erfuellt");
  });
  it("Security Defaults aktiv, CA fehlt → erfuellt", () => {
    expect(mfaErzwungen.run({ "m365.securityDefaults": sd(true) })).toMatchObject({ status: "erfuellt", snapshotIds: ["sd"] });
  });
  it("Defaults aus, CA nicht lizenziert → nicht_pruefbar", () => {
    const r = mfaErzwungen.run({ "m365.securityDefaults": sd(false), "m365.conditionalAccessPolicies": item("not_licensed") });
    expect(r).toMatchObject({ status: "nicht_pruefbar", begruendung: "Lizenz fehlt: m365.conditionalAccessPolicies" });
  });
  it("Defaults aus, CA fehlt → nicht_pruefbar", () => {
    const r = mfaErzwungen.run({ "m365.securityDefaults": sd(false) });
    expect(r.begruendung).toBe("Nachweis nicht verfügbar: m365.conditionalAccessPolicies");
  });
  it("aktive CA für alle mit MFA → erfuellt", () => expect(run(false, [caPolicy()]).status).toBe("erfuellt"));
  it("CA mit MFA nur für bestimmte Nutzer → teilweise", () =>
    expect(run(false, [caPolicy({ includeUsers: ["u-1"] })]).status).toBe("teilweise"));
  it("CA mit MFA nur im Berichtsmodus → teilweise", () => {
    const r = run(false, [caPolicy({ state: "enabledForReportingButNotEnforced" })]);
    expect(r.status).toBe("teilweise");
    expect(r.begruendung).toContain("nur im Berichtsmodus");
  });
  it("Pilotgruppe → teilweise", () => {
    const r = run(false, [caPolicy({ includeUsers: ["GuestsOrExternalUsers"] })]);
    expect(r.status).toBe("teilweise");
    expect(r.begruendung).toContain("ausgewählte Benutzer/Gruppen");
  });
  it("All mit 3 ausgeschlossenen Benutzern → teilweise", () => {
    const r = run(false, [caPolicy({ excludeUsers: ["a", "b", "c"] })]);
    expect(r.status).toBe("teilweise");
    expect(r.begruendung).toContain("3 ausgeschlossene Benutzer");
  });
  it("All mit 2 ausgeschlossenen Benutzern → erfuellt (Notfallzugang)", () => {
    const r = run(false, [caPolicy({ excludeUsers: ["a", "b"] })]);
    expect(r.status).toBe("erfuellt");
    expect(r.begruendung).toContain("2 Ausnahmekonten (Notfallzugang)");
  });
  it("excludeGroups → teilweise", () => expect(run(false, [caPolicy({ excludeGroups: ["g"] })]).status).toBe("teilweise"));
  it("excludeRoles → teilweise", () => expect(run(false, [caPolicy({ excludeRoles: ["r"] })]).status).toBe("teilweise"));
  it("nur eine Anwendung → teilweise", () => {
    const r = run(false, [caPolicy({ applications: ["app-1"] })]);
    expect(r.status).toBe("teilweise");
    expect(r.begruendung).toContain("ausgewählte Anwendungen");
  });
  it("MFA OR compliantDevice → teilweise (MFA nicht zwingend)", () =>
    expect(run(false, [caPolicy({ builtInControls: ["mfa", "compliantDevice"], operator: "OR" })]).status).toBe("teilweise"));
  it("MFA AND compliantDevice → erfuellt", () =>
    expect(run(false, [caPolicy({ builtInControls: ["mfa", "compliantDevice"], operator: "AND" })]).status).toBe("erfuellt"));
  it("authenticationStrength → erfuellt", () =>
    expect(run(false, [caPolicy({ builtInControls: [], authenticationStrength: { id: "x" } })]).status).toBe("erfuellt"));
  it("deaktivierte CA → nicht_erfuellt", () => expect(run(false, [caPolicy({ state: "disabled" })]).status).toBe("nicht_erfuellt"));
  it("CA ohne MFA-Control → nicht_erfuellt", () =>
    expect(run(false, [caPolicy({ builtInControls: ["compliantDevice"] })]).status).toBe("nicht_erfuellt"));
  it("keine Richtlinien → nicht_erfuellt", () => expect(run(false, []).status).toBe("nicht_erfuellt"));
  it("beste Richtlinie zählt (teilweise + alle → erfuellt)", () =>
    expect(run(false, [caPolicy({ includeUsers: ["u-1"] }), caPolicy()]).status).toBe("erfuellt"));
});
